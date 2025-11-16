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
import { toast } from "sonner";
import { z } from "zod";
import { useStatusUrgency } from "@/hooks/useStatusUrgency";
import { BadgeDropdown } from "@/components/BadgeDropdown";

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
  
  const { statuses, urgencies, isLoading: isLoadingSettings } = useStatusUrgency();
  
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
      fetchClients();
      fetchUsers();
      getCurrentUser();
      setCurrentUserRole(userRole || "");

      if (task) {
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
        if (task.client_id) {
          fetchProjects(task.client_id);
        }
      } else {
        // Auto-set deadline to tomorrow and default project to SMO
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        // Fetch and set default project
        fetchDefaultProject().then((defaultProject) => {
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
            fetchProjects(defaultProject.client_id);
          }
        });
      }

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
    setUsers(data || []);
  };


  const handleSubmit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = taskSchema.parse(formData);

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
        const { error } = await supabase.from("tasks").insert([taskData]);

        if (error) throw error;
        toast.success("Task created successfully!");
      }

      if (keepOpen) {
        // Reset form for next task with auto-set deadline
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update task details below" : "Fill in the task information"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="task_name">Task Name *</Label>
              <Input
                id="task_name"
                value={formData.task_name}
                onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                placeholder="Enter task name"
                required
              />
            </div>

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
                <SelectContent className="bg-background z-50">
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
                <SelectContent className="bg-background z-50">
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee_id">Assignee *</Label>
              <Select
                value={formData.assignee_id}
                onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
              >
                <SelectTrigger id="assignee_id">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="status">Status *</Label>
              <BadgeDropdown
                options={statuses.filter((status) => {
                  // Filter based on user role
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
              <Label htmlFor="urgency">Urgency *</Label>
              <BadgeDropdown
                options={urgencies}
                value={formData.urgency}
                onChange={(value) => setFormData({ ...formData, urgency: value })}
                disabled={isLoadingSettings}
                placeholder="Select urgency"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="reference_link_1">Reference Link 1</Label>
              <Input
                id="reference_link_1"
                type="url"
                value={formData.reference_link_1}
                onChange={(e) => setFormData({ ...formData, reference_link_1: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="reference_link_2">Reference Link 2</Label>
              <Input
                id="reference_link_2"
                type="url"
                value={formData.reference_link_2}
                onChange={(e) => setFormData({ ...formData, reference_link_2: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="reference_link_3">Reference Link 3</Label>
              <Input
                id="reference_link_3"
                type="url"
                value={formData.reference_link_3}
                onChange={(e) => setFormData({ ...formData, reference_link_3: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                if (onClose) onClose();
              }}
            >
              Cancel
            </Button>
            {!task && (
              <Button
                type="button"
                variant="secondary"
                onClick={(e) => handleSubmit(e as any, true)}
                disabled={loading}
              >
                {loading ? "Saving..." : "Create and Add More"}
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : task ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
