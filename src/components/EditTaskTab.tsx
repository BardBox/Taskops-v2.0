import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { ClipboardList, Calendar, Activity, Link2, Users, UsersRound, Paperclip, StickyNote, User, AlertCircle, Zap, Link, X, Wand2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useStatusUrgency } from "@/hooks/useStatusUrgency";
import { BadgeDropdown } from "@/components/BadgeDropdown";
import { TaskTimeline } from "@/components/TaskTimeline";
import { ensureSingleActiveTask } from "@/utils/taskOperations";

interface EditTaskTabProps {
  task: any;
  onTaskUpdated: () => void;
  userRole?: string;
}

export function EditTaskTab({ task, onTaskUpdated, userRole }: EditTaskTabProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(task?.reference_image || "");
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [assignedBy, setAssignedBy] = useState<any>(null);

  // New UI States
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [showCollaboratorInput, setShowCollaboratorInput] = useState(false);

  const { statuses, urgencies, isLoading: isLoadingSettings } = useStatusUrgency();

  const [formData, setFormData] = useState({
    task_name: task?.task_name || "",
    client_id: task?.client_id || "",
    project_id: task?.project_id || "",
    assignee_id: task?.assignee_id || "",
    deadline: task?.deadline || "",
    actual_delivery: task?.actual_delivery || "",
    status: task?.status || "Not Started",
    urgency: task?.urgency || "Medium",
    notes: task?.notes || "",
    estimated_minutes: task?.estimated_minutes || 0,
  });

  useEffect(() => {
    // Populate Reference Links
    const links = [];
    if (task?.reference_link_1) links.push(task.reference_link_1);
    if (task?.reference_link_2) links.push(task.reference_link_2);
    if (task?.reference_link_3) links.push(task.reference_link_3);
    setReferenceLinks(links);

    setFormData({
      task_name: task?.task_name || "",
      client_id: task?.client_id || "",
      project_id: task?.project_id || "",
      assignee_id: task?.assignee_id || "",
      deadline: task?.deadline || "",
      actual_delivery: task?.actual_delivery || "",
      status: task?.status || "Not Started",
      urgency: task?.urgency || "Medium",
      notes: task?.notes || "",
      estimated_minutes: task?.estimated_minutes || 0,
    });

    setImagePreview(task?.reference_image || "");

    // Fetch Assigned By User Details if available
    if (task?.assigned_by_id) {
      fetchAssignedBy(task.assigned_by_id);
    }
  }, [task]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };

    getCurrentUser();
    fetchClients();
    fetchUsers();
    fetchCollaborators();
    if (task?.client_id) {
      fetchProjects(task.client_id);
    }
  }, [task]);

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

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("is_archived", false)
      .order("name");
    if (data) setClients(data);
  };

  const fetchProjects = async (clientId: string) => {
    if (!clientId) {
      setProjects([]);
      return;
    }
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_archived", false)
      .order("name");
    if (data) setProjects(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*, user_roles!inner(role)")
      .order("full_name");
    if (data) setUsers(data);
  };

  const fetchCollaborators = async () => {
    const { data } = await supabase
      .from("task_collaborators")
      .select("*, profiles!task_collaborators_user_id_fkey(id, full_name, avatar_url)")
      .eq("task_id", task.id);
    if (data) setCollaborators(data);
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

  /* File Upload Logic */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error("File must be less than 50MB");
        return;
      }
      setReferenceImage(file);

      // Create preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview("");
      }
    }
  };

  const uploadReferenceFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("task-references")
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("task-references")
        .getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload reference file");
      return null;
    }
  };

  const handleRemoveFile = () => {
    setReferenceImage(null);
    setImagePreview("");
  };

  const handleAddCollaborator = async () => {
    if (!selectedCollaborator) return;

    if (collaborators.length >= 2) {
      toast.error("Maximum 2 collaborators allowed per task");
      return;
    }

    try {
      const { error } = await supabase
        .from("task_collaborators")
        .insert({
          task_id: task.id,
          user_id: selectedCollaborator,
          added_by_id: currentUserId,
        });

      if (error) {
        if (error.message.includes('Maximum 2 collaborators')) {
          toast.error("Maximum 2 collaborators allowed per task");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Collaborator added successfully!");
      setSelectedCollaborator("");
      setShowCollaboratorInput(false);
      fetchCollaborators();
    } catch (error: any) {
      console.error("Error adding collaborator:", error);
      toast.error(error.message || "Failed to add collaborator");
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from("task_collaborators")
        .delete()
        .eq("id", collaboratorId);
      if (error) throw error;
      toast.success("Collaborator removed");
      fetchCollaborators();
    } catch (error) {
      console.error("Error removing collaborator:", error);
      toast.error("Failed to remove collaborator");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let referenceImageUrl = task.reference_image;

      // If we have a new file, upload it
      if (referenceImage) {
        const uploadedUrl = await uploadReferenceFile(referenceImage);
        if (uploadedUrl) referenceImageUrl = uploadedUrl;
      }
      // If we cleared the image (no file, no preview), set to null
      else if (!imagePreview && !task.reference_image) {
        referenceImageUrl = null;
      }

      let actualDeliveryDate = formData.actual_delivery;

      // Logic to calculate delivery date based on Approval status
      if (formData.status === 'Approved' && task.status !== 'Approved') {
        try {
          const { data: historyData } = await supabase
            .from('task_edit_history')
            .select('edited_at')
            .eq('task_id', task.id)
            .eq('field_name', 'status')
            .eq('new_value', 'In Approval')
            .order('edited_at', { ascending: false })
            .limit(1)
            .single();

          if (historyData) {
            actualDeliveryDate = historyData.edited_at;
          } else {
            actualDeliveryDate = new Date().toISOString();
          }
        } catch (err) {
          console.error("Error fetching history for delivery date:", err);
          actualDeliveryDate = new Date().toISOString();
        }
      }

      const updateData: any = {
        task_name: formData.task_name,
        client_id: formData.client_id || null,
        project_id: formData.project_id || null,
        assignee_id: formData.assignee_id,
        deadline: formData.deadline || null,
        actual_delivery: actualDeliveryDate || null,
        status: formData.status,
        urgency: formData.urgency,
        reference_link_1: referenceLinks[0] || null,
        reference_link_2: referenceLinks[1] || null,
        reference_link_3: referenceLinks[2] || null,
        reference_image: referenceImageUrl,
        estimated_minutes: formData.estimated_minutes || null,
      };

      if (userRole !== "team_member") {
        updateData.notes = formData.notes || null;
      }

      // Enforce Single Active Task Rule
      if (formData.status === "In Progress" && task.status !== "In Progress") {
        await ensureSingleActiveTask(formData.assignee_id || task.assignee_id, task.id);
      }

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", task.id);

      if (error) throw error;
      toast.success("Task updated successfully!");
      onTaskUpdated();
    } catch (error: any) {
      toast.error(error.message || "Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
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
              required
              className="text-base"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_id" className="text-sm font-medium">Client</Label>
              <Select
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
            <div className="flex-1 min-w-[140px] space-y-2">
              <Label htmlFor="assignee_id" className="text-sm font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Task Owner *
              </Label>
              <Select
                value={formData.assignee_id}
                onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
              >
                <SelectTrigger id="assignee_id">
                  <SelectValue placeholder="Select assignee" />
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
            <div className="flex-1 min-w-[140px] space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <UsersRound className="h-3.5 w-3.5" />
                Collaborators ({collaborators.length}/2)
              </Label>
              <div className="space-y-2">
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
                </div>

                {collaborators.length < 2 && !showCollaboratorInput && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCollaboratorInput(true)}
                    className="w-full border-dashed h-9"
                  >
                    + Add Collaborator
                  </Button>
                )}

                {collaborators.length < 2 && showCollaboratorInput && (
                  <div className="flex gap-2">
                    <Select
                      value={selectedCollaborator}
                      onValueChange={(value) => setSelectedCollaborator(value)}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(user =>
                            user.id !== formData.assignee_id &&
                            !collaborators.some(c => c.user_id === user.id)
                          )
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddCollaborator} size="sm" className="h-9 px-3">Add</Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowCollaboratorInput(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Project Manager */}
            {task && assignedBy && (
              <div className="flex-1 min-w-[140px] space-y-2">
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

          {/* Deadline & Estimation Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deadline" className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Deadline
              </Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_hours" className="text-sm font-medium">Estimated Duration (Hours)</Label>
              <Input
                id="estimated_hours"
                type="number"
                min="0"
                step="0.1"
                value={formData.estimated_minutes ? formData.estimated_minutes / 60 : ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setFormData({
                    ...formData,
                    estimated_minutes: isNaN(val) ? 0 : Math.round(val * 60)
                  });
                }}
                placeholder="e.g. 2.5"
              />
            </div>
          </div>
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
                  // Filter statuses if needed based on role, matching TaskDialog logic
                  if (userRole === 'team_member' && !['Not Started', 'In Progress', 'In Approval'].includes(status.label)) {
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

          {/* Reference File */}
          <div className="space-y-2">
            {!imagePreview && !task.reference_image ? (
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFileSelect}
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
                    <p className="text-xs text-muted-foreground mt-1">Image, Video, or Doc (Max 50MB)</p>
                  </div>
                </Label>
              </div>
            ) : (
              <div className="relative mt-2 inline-block group">
                {imagePreview || (task.reference_image && task.reference_image.match(/\.(jpeg|jpg|gif|png|webp)$/i)) ? (
                  <img
                    src={imagePreview || task.reference_image}
                    alt="Reference preview"
                    className="max-w-xs max-h-40 rounded-lg border shadow-sm aspect-video object-cover"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted max-w-xs">
                    <Paperclip className="h-8 w-8 text-blue-500" />
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium truncate max-w-[180px]">
                        {referenceImage?.name || task.reference_image.split('/').pop() || "Attached File"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {referenceImage ? `${(referenceImage.size / 1024 / 1024).toFixed(2)} MB` : "File attached"}
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleRemoveFile}
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
              disabled={userRole === "team_member"}
            />
            {userRole === "team_member" && (
              <p className="text-xs text-muted-foreground">
                Only project managers and owners can edit the task description.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
