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
import { X, ClipboardList, Users, AlertCircle, Link2, StickyNote, Calendar, Activity, User, UsersRound, Wand2, Zap, Link, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskTimeline } from "@/components/TaskTimeline";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  onClose?: () => void;
  userRole?: string;
  duplicateData?: {
    task_name: string;
    client_id: string;
    project_id: string;
    assignee_id: string;
    urgency: string;
    reference_link_1?: string;
    reference_link_2?: string;
    reference_link_3?: string;
    notes?: string;
    reference_image?: string;
  };
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

export const TaskDialog = ({ open, onOpenChange, task, onClose, userRole, duplicateData }: TaskDialogProps) => {
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
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);

  // New State for List UIs
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [showCollaboratorInput, setShowCollaboratorInput] = useState(false);

  const { statuses, urgencies, isLoading: isLoadingSettings } = useStatusUrgency();

  const effectiveRole = userRole || currentUserRole;
  const canEditNotes = effectiveRole === "project_manager" || effectiveRole === "project_owner";

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

          // Populate reference links array
          const links = [];
          if (task.reference_link_1) links.push(task.reference_link_1);
          if (task.reference_link_2) links.push(task.reference_link_2);
          if (task.reference_link_3) links.push(task.reference_link_3);
          setReferenceLinks(links);

          setExistingImageUrl(task.reference_image || "");
          setImagePreview(task.reference_image || "");
        } else {
          // Creating new task - set default values
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];

          setReferenceLinks([]);

          // Check if we have duplicate data
          if (duplicateData) {
            setReferenceImage(null);
            setExistingImageUrl(duplicateData.reference_image || "");
            setImagePreview(duplicateData.reference_image || "");

            const links = [];
            if (duplicateData.reference_link_1) links.push(duplicateData.reference_link_1);
            if (duplicateData.reference_link_2) links.push(duplicateData.reference_link_2);
            if (duplicateData.reference_link_3) links.push(duplicateData.reference_link_3);
            setReferenceLinks(links);

            setFormData({
              task_name: `Copy of ${duplicateData.task_name}`,
              client_id: duplicateData.client_id || "",
              project_id: duplicateData.project_id || "",
              assignee_id: duplicateData.assignee_id || "",
              deadline: tomorrowStr,
              status: "Not Started",
              urgency: duplicateData.urgency || "Medium",
              reference_link_1: duplicateData.reference_link_1 || "",
              reference_link_2: duplicateData.reference_link_2 || "",
              reference_link_3: duplicateData.reference_link_3 || "",
              notes: duplicateData.notes || "",
            });

            if (duplicateData.client_id) {
              await fetchProjects(duplicateData.client_id);
            }
          } else {
            setReferenceImage(null);
            setExistingImageUrl("");
            setImagePreview("");
            setReferenceLinks([]);

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

            if (defaultProject?.client_id) {
              await fetchProjects(defaultProject.client_id);
            }
          }
        }
      };

      initializeDialog();

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
      const { data, error } = await supabase
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

  const handleAddLink = () => {
    if (!newLink) return;

    const urlPattern = /^(https?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/;
    if (!urlPattern.test(newLink)) {
      toast.error("Invalid URL format. Must start with http:// or https://");
      return;
    }

    if (referenceLinks.length >= 3) {
      toast.error("Maximum 3 reference links allowed");
      return;
    }
    setReferenceLinks([...referenceLinks, newLink]);
    setNewLink("");
    setShowLinkInput(false);
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = [...referenceLinks];
    newLinks.splice(index, 1);
    setReferenceLinks(newLinks);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setReferenceImage(file);
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
    setExistingImageUrl("");
  };

  const handleAddCollaborators = async (taskId: string) => {
    if (selectedCollaborators.length > 0) {
      const collaboratorsToAdd = selectedCollaborators.map(userId => ({
        task_id: taskId,
        user_id: userId,
        added_by_id: currentUserId,
      }));

      const { error } = await supabase
        .from("task_collaborators")
        .insert(collaboratorsToAdd);

      if (error) {
        console.error("Error adding collaborators:", error);
      }
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!task?.id) return;
    try {
      const { error } = await supabase
        .from("task_collaborators")
        .delete()
        .eq("id", collaboratorId);

      if (error) throw error;
      await fetchCollaborators(task.id);
      toast.success("Collaborator removed");
    } catch (error: any) {
      console.error("Error removing collaborator:", error);
      toast.error("Failed to remove collaborator");
    }
  };

  const handleSubmit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Map links array back to individual fields
      const submitData = {
        ...formData,
        reference_link_1: referenceLinks[0] || "",
        reference_link_2: referenceLinks[1] || "",
        reference_link_3: referenceLinks[2] || "",
      };

      const validated = taskSchema.parse(submitData);

      let referenceImageUrl = existingImageUrl;
      if (referenceImage) {
        const uploadedUrl = await uploadReferenceImage(referenceImage);
        if (uploadedUrl) {
          referenceImageUrl = uploadedUrl;
        }
      } else if (!existingImageUrl && !imagePreview) {
        // Explicitly cleared
        referenceImageUrl = "";
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

      if (!canEditNotes) {
        if (task) {
          delete taskData.notes;
        } else {
          taskData.notes = null;
        }
      }

      if (task) {
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", task.id);

        if (error) throw error;

        if (selectedCollaborators.length > 0) {
          await handleAddCollaborators(task.id);
        }

        toast.success("Task updated successfully!");
      } else {
        const { data: newTask, error } = await supabase
          .from("tasks")
          .insert([taskData])
          .select()
          .single();

        if (error) throw error;

        if (newTask && selectedCollaborators.length > 0) {
          await handleAddCollaborators(newTask.id);
        }

        toast.success("Task created successfully!");
      }

      if (keepOpen) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        setReferenceImage(null);
        setExistingImageUrl("");
        setImagePreview("");
        setReferenceLinks([]);
        setSelectedCollaborators([]);

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
          <Card className="border-l-4 border-l-[hsl(var(--section-essentials))] shadow-sm">
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
          <Card className="border-l-4 border-l-[hsl(var(--section-assignment))] shadow-sm">
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

                {/* Collaborators */}
                <div className="flex-1 min-w-[200px] space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <UsersRound className="h-3.5 w-3.5" />
                    Collaborators ({collaborators.length + selectedCollaborators.length}/2)
                  </Label>
                  <div className="space-y-2">
                    {/* Existing Collaborators List */}
                    <div className="flex flex-wrap gap-2">
                      {collaborators.map((collab) => (
                        <div key={collab.id} className="flex items-center gap-1.5 bg-muted px-2 py-1.5 rounded-md border text-sm">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={collab.profiles?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {collab.profiles?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-xs">{collab.profiles?.full_name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCollaborator(collab.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {selectedCollaborators.map((userId) => {
                        const user = users.find(u => u.id === userId);
                        if (!user) return null;
                        return (
                          <div key={userId} className="flex items-center gap-1.5 bg-secondary px-2 py-1.5 rounded-md border text-sm">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {user.full_name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-xs">{user.full_name}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedCollaborators(selectedCollaborators.filter(id => id !== userId))}
                              className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {(collaborators.length + selectedCollaborators.length) < 2 && !showCollaboratorInput ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCollaboratorInput(true)}
                        className="w-full border-dashed h-9"
                      >
                        + Add Collaborator
                      </Button>
                    ) : (collaborators.length + selectedCollaborators.length) < 2 && showCollaboratorInput ? (
                      <div className="flex gap-2">
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value) {
                              setSelectedCollaborators([...selectedCollaborators, value]);
                              setShowCollaboratorInput(false);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Select collaborator" />
                          </SelectTrigger>
                          <SelectContent>
                            {users
                              .filter(user =>
                                user.id !== formData.assignee_id &&
                                !collaborators.some(c => c.user_id === user.id) &&
                                !selectedCollaborators.includes(user.id)
                              )
                              .map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.full_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowCollaboratorInput(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Project Manager (Assigned By) */}
                {task && assignedBy && (
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Wand2 className="h-3.5 w-3.5 text-purple-500" />
                      Project Manager
                    </Label>
                    <div className="flex items-center gap-2 p-2 px-3 border rounded-md bg-muted/30 h-10">
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
          <Card className="border-l-4 border-l-[hsl(var(--section-priority))] shadow-sm">
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
          <Card className="border-l-4 border-l-[hsl(var(--section-references))] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[hsl(var(--section-references))]">
                <Link2 className="h-4 w-4 text-teal-500" />
                References & Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reference Links */}
              <div className="space-y-3">
                <div className="space-y-2">
                  {referenceLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted p-2 rounded-md border text-sm">
                      <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 hover:underline cursor-pointer font-medium" title={link}>
                        {link}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {referenceLinks.length < 3 && !showLinkInput && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowLinkInput(true)}
                      className="w-full py-6 bg-muted/20 border-dashed"
                    >
                      <Link className="mr-2 h-4 w-4" />
                      Add Reference Link
                    </Button>
                  )}

                  {showLinkInput && (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                      <Input
                        placeholder="https://"
                        value={newLink}
                        onChange={(e) => setNewLink(e.target.value)}
                        autoFocus
                        className="flex-1"
                      />
                      <Button type="button" onClick={handleAddLink} size="sm">Add</Button>
                      <Button type="button" variant="ghost" onClick={() => setShowLinkInput(false)} size="icon"><X className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Reference Image */}
              <div className="space-y-2">
                {!imagePreview ? (
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <Label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Paperclip className="w-5 h-5 mb-1 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground font-medium">Add Reference File</p>
                        <p className="text-xs text-muted-foreground mt-1">Max 5MB (Images only)</p>
                      </div>
                    </Label>
                  </div>
                ) : (
                  <div className="relative mt-2 inline-block group">
                    <img
                      src={imagePreview}
                      alt="Reference preview"
                      className="max-w-xs max-h-40 rounded-lg border shadow-sm aspect-video object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {/* Additional Context Section */}
          <Card className="border-l-4 border-l-[hsl(var(--section-context))] shadow-sm">
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
                  disabled={!canEditNotes}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.notes.length} / 1000 characters
                </p>
                {!canEditNotes && (
                  <p className="text-xs text-muted-foreground">
                    Only project managers and owners can edit the task description.
                  </p>
                )}
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
