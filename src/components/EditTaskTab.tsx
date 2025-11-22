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
import { ClipboardList, Calendar, Activity, Link2, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useStatusUrgency } from "@/hooks/useStatusUrgency";

interface EditTaskTabProps {
  task: any;
  onTaskUpdated: () => void;
}

export function EditTaskTab({ task, onTaskUpdated }: EditTaskTabProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(task?.reference_image || "");
  
  const { statuses, urgencies } = useStatusUrgency();
  
  const [formData, setFormData] = useState({
    task_name: task?.task_name || "",
    client_id: task?.client_id || "",
    project_id: task?.project_id || "",
    assignee_id: task?.assignee_id || "",
    date: task?.date || "",
    deadline: task?.deadline || "",
    actual_delivery: task?.actual_delivery || "",
    status: task?.status || "Not Started",
    urgency: task?.urgency || "Medium",
    notes: task?.notes || "",
    reference_link_1: task?.reference_link_1 || "",
    reference_link_2: task?.reference_link_2 || "",
    reference_link_3: task?.reference_link_3 || "",
  });

  useEffect(() => {
    fetchClients();
    fetchUsers();
    fetchCollaborators();
    if (task?.client_id) {
      fetchProjects(task.client_id);
    }
  }, [task]);

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
      .select("*, profiles(id, full_name, avatar_url)")
      .eq("task_id", task.id);
    if (data) setCollaborators(data);
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
      toast.error("Failed to upload reference image");
      return null;
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
      if (referenceImage) {
        const uploadedUrl = await uploadReferenceImage(referenceImage);
        if (uploadedUrl) referenceImageUrl = uploadedUrl;
      }

      const { error } = await supabase
        .from("tasks")
        .update({
          task_name: formData.task_name,
          client_id: formData.client_id || null,
          project_id: formData.project_id || null,
          assignee_id: formData.assignee_id,
          date: formData.date,
          deadline: formData.deadline || null,
          actual_delivery: formData.actual_delivery || null,
          status: formData.status,
          urgency: formData.urgency,
          notes: formData.notes || null,
          reference_link_1: formData.reference_link_1 || null,
          reference_link_2: formData.reference_link_2 || null,
          reference_link_3: formData.reference_link_3 || null,
          reference_image: referenceImageUrl || null,
        })
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
      {/* Basic Info Section */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task_name">Task Name *</Label>
            <Input
              id="task_name"
              value={formData.task_name}
              onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
              required
            />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
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
              <Label htmlFor="project_id">Project</Label>
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

          <div className="space-y-2">
            <Label htmlFor="assignee_id">Task Owner/Assignee *</Label>
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
        </CardContent>
      </Card>

      {/* Timeline Section */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date Assigned</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual_delivery">Actual Delivery</Label>
              <Input
                id="actual_delivery"
                type="date"
                value={formData.actual_delivery}
                onChange={(e) => setFormData({ ...formData, actual_delivery: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status & Priority Section */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Status & Priority
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.label} value={status.label}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) => setFormData({ ...formData, urgency: value })}
              >
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {urgencies.map((urgency) => (
                    <SelectItem key={urgency.label} value={urgency.label}>
                      {urgency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description & References Section */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Description & References
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Description/Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Enter task description and notes..."
            />
          </div>

          <div className="space-y-3">
            <Label>Reference Links</Label>
            <Input
              placeholder="Reference Link 1"
              value={formData.reference_link_1}
              onChange={(e) => setFormData({ ...formData, reference_link_1: e.target.value })}
            />
            <Input
              placeholder="Reference Link 2"
              value={formData.reference_link_2}
              onChange={(e) => setFormData({ ...formData, reference_link_2: e.target.value })}
            />
            <Input
              placeholder="Reference Link 3"
              value={formData.reference_link_3}
              onChange={(e) => setFormData({ ...formData, reference_link_3: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_image">Reference Image</Label>
            <Input
              id="reference_image"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Reference"
                  className="max-w-xs max-h-40 rounded border"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Collaborators Section */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Collaborators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {collaborators.map((collab) => (
              <Badge key={collab.id} variant="secondary" className="flex items-center gap-2 py-1 px-3">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={collab.profiles?.avatar_url} />
                  <AvatarFallback>{collab.profiles?.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                {collab.profiles?.full_name}
                <button
                  type="button"
                  onClick={() => handleRemoveCollaborator(collab.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {collaborators.length === 0 && (
              <p className="text-sm text-muted-foreground">No collaborators added</p>
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
