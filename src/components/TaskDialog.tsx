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

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  onClose?: () => void;
}

const taskSchema = z.object({
  task_name: z.string().min(1, "Task name is required").max(200),
  client_id: z.string().optional(),
  assignee_id: z.string().min(1, "Assignee is required"),
  deadline: z.string().optional(),
  status: z.string(),
  urgency: z.string(),
  reference_link_1: z.string().url().optional().or(z.literal("")),
  reference_link_2: z.string().url().optional().or(z.literal("")),
  reference_link_3: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export const TaskDialog = ({ open, onOpenChange, task, onClose }: TaskDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [formData, setFormData] = useState({
    task_name: "",
    client_id: "",
    assignee_id: "",
    deadline: "",
    status: "To Do",
    urgency: "Mid",
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

      if (task) {
        setFormData({
          task_name: task.task_name || "",
          client_id: task.client_id || "",
          assignee_id: task.assignee_id || "",
          deadline: task.deadline || "",
          status: task.status || "To Do",
          urgency: task.urgency || "Mid",
          reference_link_1: task.reference_link_1 || "",
          reference_link_2: task.reference_link_2 || "",
          reference_link_3: task.reference_link_3 || "",
          notes: task.notes || "",
        });
      } else {
        // Auto-set deadline to tomorrow if creating new task
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        setFormData({
          task_name: "",
          client_id: "",
          assignee_id: "",
          deadline: tomorrowStr,
          status: "To Do",
          urgency: "Mid",
          reference_link_1: "",
          reference_link_2: "",
          reference_link_3: "",
          notes: "",
        });
      }
    }
  }, [open, task]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    setClients(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("full_name");
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
          assignee_id: "",
          deadline: tomorrowStr,
          status: "To Do",
          urgency: "Mid",
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
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
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
              <Label htmlFor="assignee_id">Assignee *</Label>
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
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="Doing">Doing</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency *</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) => setFormData({ ...formData, urgency: value })}
              >
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Mid">Mid</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Immediate">Immediate</SelectItem>
                </SelectContent>
              </Select>
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
