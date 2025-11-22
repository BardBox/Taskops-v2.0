import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { useStatusUrgency } from "@/hooks/useStatusUrgency";
import { BadgeDropdown } from "@/components/BadgeDropdown";
import { X, ClipboardList, Users, AlertCircle, Link2, StickyNote, Calendar, Activity, User, UsersRound, Wand2, Zap, Link, Paperclip, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskTimeline } from "@/components/TaskTimeline";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  onClose?: () => void;
  userRole?: string;
}

const taskSchema = z.object({
  task_name: z.string().min(1, "Task name is required").max(200),
  client_id: z.string().optional(),
  project_id: z.string().optional(),
  assignee_id: z.string().min(1, "Assignee is required"),
  deadline: z.string().optional(),
  status: z.string(),
  urgency: z.string(),
  reference_link_1: z.string().url().optional().or(z.literal("")),
  reference_link_2: z.string().url().optional().or(z.literal("")),
  reference_link_3: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export const TaskDialog = ({ open, onOpenChange, task, onClose, userRole }: TaskDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [assignedBy, setAssignedBy] = useState<any>(null);
  
  const { statuses, urgencies, isLoading: isLoadingSettings} = useStatusUrgency();
  
  const [formData, setFormData] = useState({
    task_name: "",
    client_id: "",
    project_id: "",
    assignee_id: "",
    deadline: "",
    status: "Not Started",
    urgency: "Medium",
    reference_link_1: "",
    reference_link_2: "",
    reference_link_3: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      const initializeDialog = async () => {
        setCurrentUserRole(userRole || "");
        await getCurrentUser();
        
        // Fetch all data first
        await Promise.all([
          fetchClients(),
          fetchUsers()
        ]);

        if (task) {
          // Fetch projects FIRST before setting form data
          if (task.client_id) {
            await fetchProjects(task.client_id);
          }
          
          // Fetch collaborators and assigned by user
          await fetchCollaborators(task.id);
          await fetchAssignedBy(task.assigned_by_id);

          // Set form data AFTER projects are loaded
          setFormData({
            task_name: task.task_name || "",
            client_id: task.client_id || "",
            project_id: task.project_id || "",
            assignee_id: task.assignee_id || "",
            deadline: task.deadline || "",
            status: task.status || "Not Started",
            urgency: task.urgency || "Medium",
            reference_link_1: task.reference_link_1 || "",
            reference_link_2: task.reference_link_2 || "",
            reference_link_3: task.reference_link_3 || "",
            notes: task.notes || "",
          });
          
          setExistingImageUrl(task.reference_image || "");
          setImagePreview(task.reference_image || "");
        } else {
          // Creating new task - set default values
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          
          setReferenceImage(null);
          setExistingImageUrl("");
          setImagePreview("");
          
          // Fetch default project and set it in form
          const defaultProject = await fetchDefaultProject();
          setFormData({
            task_name: "",
            client_id: defaultProject?.client_id || "",
            project_id: defaultProject?.id || "",
            assignee_id: "",
            deadline: tomorrowStr,
            status: "Not Started",
            urgency: "Medium",
            reference_link_1: "",
            reference_link_2: "",
            reference_link_3: "",
            notes: "",
          });
          
          // Fetch projects for the default client
          if (defaultProject?.client_id) {
            await fetchProjects(defaultProject.client_id);
          }
        }
      };

      initializeDialog();

      // Set up real-time subscription for profiles
      const profilesChannel = supabase
        .channel("profiles-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
          },
          () => fetchUsers()
        )
        .subscribe();

      // Set up real-time subscription for user_roles
      const rolesChannel = supabase
        .channel("user-roles-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_roles",
          },
          () => fetchUsers()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(profilesChannel);
        supabase.removeChannel(rolesChannel);
      };
    }
  }, [open, task]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchDefaultProject = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("is_default", true)
        .eq("is_archived", false)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching default project:", error);
      return null;
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error} = await supabase
        .from("clients")
        .select("*")
        .eq("is_archived", false)
        .order("name");
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchProjects = async (clientId: string) => {
    if (!clientId) {
      setProjects([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_archived", false)
        .order("name");
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*, user_roles!inner(role)")
      .order("full_name");
    
    if (data) {
      setUsers(data);
    }
  };

  const fetchCollaborators = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from("task_collaborators")
        .select("*, profiles(id, full_name, avatar_url)")
        .eq("task_id", taskId);
      
      if (error) throw error;
      setCollaborators(data || []);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
    }
  };

  const fetchAssignedBy = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", userId)
        .single();
      
      if (error) throw error;
      setAssignedBy(data);
    } catch (error) {
      console.error("Error fetching assigned by user:", error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setReferenceImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadReferenceImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("task-references")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("task-references")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload reference image");
      return null;
    }
  };

  const handleRemoveImage = () => {
    setReferenceImage(null);
    setImagePreview("");
  };

  const handleSubmit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = taskSchema.parse(formData);

      // Upload reference image if new one is selected
      let referenceImageUrl = existingImageUrl;
      if (referenceImage) {
        const uploadedUrl = await uploadReferenceImage(referenceImage);
        if (uploadedUrl) {
          referenceImageUrl = uploadedUrl;
        }
      }

      const taskData: any = {
        task_name: validated.task_name,
        assignee_id: validated.assignee_id,
        assigned_by_id: currentUserId,
        status: validated.status,
        urgency: validated.urgency,
        client_id: validated.client_id || null,
        project_id: validated.project_id || null,
        deadline: validated.deadline || null,
        reference_link_1: validated.reference_link_1 || null,
        reference_link_2: validated.reference_link_2 || null,
        reference_link_3: validated.reference_link_3 || null,
        reference_image: referenceImageUrl || null,
        notes: validated.notes || null,
      };

      if (task) {
        // Update existing task
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", task.id);

        if (error) throw error;

        toast.success("Task updated successfully!");
      } else {
        // Create new task
        const { data: newTask, error } = await supabase
          .from("tasks")
          .insert([taskData])
          .select()
          .single();

        if (error) throw error;

        toast.success("Task created successfully!");
      }

      if (keepOpen) {
        // Reset form for next task with auto-set deadline
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        setReferenceImage(null);
        setExistingImageUrl("");
        setImagePreview("");
        
        setFormData({
          task_name: "",
          client_id: "",
          project_id: "",
          assignee_id: "",
          deadline: tomorrowStr,
          status: "Not Started",
          urgency: "Medium",
          reference_link_1: "",
          reference_link_2: "",
          reference_link_3: "",
          notes: "",
        });
      } else {
        onOpenChange(false);
        if (onClose) onClose();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to save task");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update task details below" : "Fill in the task information"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Essentials Section */}
          <Card className="border-l-4 border-l-[hsl(var(--section-essentials))] bg-[hsl(var(--section-essentials-bg))] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[hsl(var(--section-essentials))]">
                <ClipboardList className="h-4 w-4" />
                Task Essentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task_name" className="text-sm font-medium">Task Name *</Label>
                <Input
                  id="task_name"
                  value={formData.task_name}
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                  placeholder="Enter a clear, descriptive task name"
                  className="text-base"
                  required
                />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client_id" className="text-sm font-medium">Client</Label>
                  <Select
                    key={`client-${task?.id || 'new'}`}
                    value={formData.client_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, client_id: value, project_id: "" });
                      fetchProjects(value);
                    }}
                  >
                    <SelectTrigger id="client_id">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_id" className="text-sm font-medium">Project</Label>
                  <Select
                    key={`project-${task?.id || 'new'}`}
                    value={formData.project_id}
                    onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                    disabled={!formData.client_id}
                  >
                    <SelectTrigger id="project_id">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment & Timeline Section */}
          <Card className="border-l-4 border-l-[hsl(var(--section-assignment))] bg-[hsl(var(--section-assignment-bg))] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[hsl(var(--section-assignment))]">
                <Users className="h-4 w-4" />
                Team & Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Team Row - Task Owner, Collaborators, Project Manager */}
              <div className="flex flex-wrap items-start gap-4">
                {/* Task Owner */}
                <div className="flex-1 min-w-[200px] space-y-2">
                  <Label htmlFor="assignee_id" className="text-sm font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Task Owner *
                  </Label>
                  <Select
                    key={task?.id || 'new'}
                    value={formData.assignee_id}
                    onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
                  >
                    <SelectTrigger id="assignee_id">
                      <SelectValue placeholder="Select task owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Collaborators (Read-only display when editing) */}
                {task && collaborators.length > 0 && (
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <UsersRound className="h-3.5 w-3.5" />
                      Collaborators
                    </Label>
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30 min-h-[40px]">
                      {collaborators.map((collab) => (
                        <div key={collab.id} className="flex items-center gap-1.5">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={collab.profiles?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {collab.profiles?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{collab.profiles?.full_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Manager (Assigned By) */}
                {task && assignedBy && (
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Wand2 className="h-3.5 w-3.5 text-purple-500" />
                      Project Manager
                    </Label>
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30 min-h-[40px]">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={assignedBy.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {assignedBy.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{assignedBy.full_name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline Bar */}
              {task && task.date && task.deadline && (
                <TaskTimeline 
                  dateAssigned={task.date}
                  deadline={task.deadline}
                  dateSubmitted={task.actual_delivery}
                />
              )}

              {/* Deadline input for new tasks */}
              {!task && (
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Deadline *
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority & Status Section */}
          <Card className="border-l-4 border-l-[hsl(var(--section-priority))] bg-[hsl(var(--section-priority-bg))] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[hsl(var(--section-priority))]">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Priority & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-blue-500" />
                    Status *
                  </Label>
                  <BadgeDropdown
                    options={statuses.filter((status) => {
                      if (currentUserRole === 'team_member' && !['Not Started', 'In Progress', 'In Approval'].includes(status.label)) {
                        return false;
                      }
                      return true;
                    })}
                    value={formData.status}
                    onChange={(value) => setFormData({ ...formData, status: value })}
                    disabled={isLoadingSettings}
                    placeholder="Select status"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency" className="text-sm font-medium flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-red-500" />
                    Urgency *
                  </Label>
                  <BadgeDropdown
                    options={urgencies}
                    value={formData.urgency}
                    onChange={(value) => setFormData({ ...formData, urgency: value })}
                    disabled={isLoadingSettings}
                    placeholder="Select urgency"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* References & Resources Section */}
          <Card className="border-l-4 border-l-[hsl(var(--section-references))] bg-[hsl(var(--section-references-bg))] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[hsl(var(--section-references))]">
                <Link2 className="h-4 w-4 text-teal-500" />
                References & Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="reference_link_1" className="text-sm font-medium flex items-center gap-1.5">
                    <Link className="h-3.5 w-3.5 text-blue-500" />
                    Reference Link 1
                  </Label>
                  <Input
                    id="reference_link_1"
                    type="url"
                    value={formData.reference_link_1}
                    onChange={(e) => setFormData({ ...formData, reference_link_1: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_link_2" className="text-sm font-medium flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-emerald-500" />
                    Reference Link 2
                  </Label>
                  <Input
                    id="reference_link_2"
                    type="url"
                    value={formData.reference_link_2}
                    onChange={(e) => setFormData({ ...formData, reference_link_2: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_link_3" className="text-sm font-medium flex items-center gap-1.5">
                    <Bookmark className="h-3.5 w-3.5 text-violet-500" />
                    Reference Link 3
                  </Label>
                  <Input
                    id="reference_link_3"
                    type="url"
                    value={formData.reference_link_3}
                    onChange={(e) => setFormData({ ...formData, reference_link_3: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_image" className="text-sm font-medium">Reference Image (Max 5MB)</Label>
                  <Input
                    id="reference_image"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageSelect}
                    className="cursor-pointer"
                  />
                  {imagePreview && (
                    <div className="relative mt-2 inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Reference preview" 
                        className="max-w-xs max-h-40 rounded-lg border-2 shadow-sm"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Context Section */}
          <Card className="border-l-4 border-l-[hsl(var(--section-context))] bg-[hsl(var(--section-context-bg))] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[hsl(var(--section-context))]">
                <StickyNote className="h-4 w-4" />
                Additional Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional context, requirements, or special instructions..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.notes.length} / 1000 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                if (onClose) onClose();
              }}
              className="min-w-24"
            >
              Cancel
            </Button>
            {!task && (
              <Button
                type="button"
                variant="secondary"
                onClick={(e) => handleSubmit(e as any, true)}
                disabled={loading}
                className="min-w-40"
              >
                {loading ? "Saving..." : "Create and Add More"}
              </Button>
            )}
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading ? "Saving..." : task ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
