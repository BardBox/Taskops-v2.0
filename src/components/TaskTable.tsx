import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskDialog } from "./TaskDialog";
import { Edit2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Task {
  id: string;
  date: string;
  task_name: string;
  client_id: string | null;
  assignee_id: string;
  assigned_by_id: string;
  deadline: string | null;
  actual_delivery: string | null;
  status: string;
  urgency: string;
  asset_link: string | null;
  notes: string | null;
  clients: { name: string } | null;
  assignee: { full_name: string } | null;
  assigned_by: { full_name: string } | null;
}

interface TaskTableProps {
  userRole: string;
  userId: string;
}

export const TaskTable = ({ userRole, userId }: TaskTableProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        clients(name),
        assignee:profiles!tasks_assignee_id_fkey(full_name),
        assigned_by:profiles!tasks_assigned_by_id_fkey(full_name)
      `)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }

    setTasks(data || []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "To Do":
        return "bg-gray-100 text-gray-800";
      case "Doing":
        return "bg-blue-100 text-blue-800";
      case "Done":
        return "bg-green-100 text-green-800";
      case "Approved":
        return "bg-secondary text-secondary-foreground";
      case "On Hold":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Immediate":
        return "bg-red-100 text-red-800";
      case "High":
        return "bg-orange-100 text-orange-800";
      case "Mid":
        return "bg-blue-100 text-blue-800";
      case "Low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateDelay = (deadline: string | null, actualDelivery: string | null, status: string) => {
    if (status === "Approved" || status === "Cancelled") return null;
    if (!deadline) return null;

    const deadlineDate = new Date(deadline);
    const compareDate = actualDelivery ? new Date(actualDelivery) : new Date();
    const diffTime = compareDate.getTime() - deadlineDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const canEdit = (task: Task) => {
    if (userRole === "project_manager") return true;
    if (userRole === "team_member" && task.assignee_id === userId) {
      return task.status !== "Approved";
    }
    return false;
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update status");
      console.error("Error updating status:", error);
    } else {
      toast.success("Status updated");
    }
  };

  const handleUrgencyChange = async (taskId: string, newUrgency: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ urgency: newUrgency })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update urgency");
      console.error("Error updating urgency:", error);
    } else {
      toast.success("Urgency updated");
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Assigned By</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Delay</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No tasks yet. Create your first task to get started.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const delay = calculateDelay(task.deadline, task.actual_delivery, task.status);
                return (
                  <TableRow key={task.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(task.date), "MMM dd")}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {task.task_name}
                    </TableCell>
                    <TableCell>{task.clients?.name || "-"}</TableCell>
                    <TableCell>{task.assignee?.full_name || "-"}</TableCell>
                    <TableCell>{task.assigned_by?.full_name || "-"}</TableCell>
                    <TableCell>
                      {task.deadline ? format(new Date(task.deadline), "MMM dd") : "-"}
                    </TableCell>
                    <TableCell>
                      {canEdit(task) ? (
                        <Select
                          value={task.status}
                          onValueChange={(value) => handleStatusChange(task.id, value)}
                        >
                          <SelectTrigger className={`w-32 h-8 ${getStatusColor(task.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="To Do">To Do</SelectItem>
                            <SelectItem value="Doing">Doing</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit(task) ? (
                        <Select
                          value={task.urgency}
                          onValueChange={(value) => handleUrgencyChange(task.id, value)}
                        >
                          <SelectTrigger className={`w-32 h-8 ${getUrgencyColor(task.urgency)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Mid">Mid</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Immediate">Immediate</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={getUrgencyColor(task.urgency)}>
                          {task.urgency}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {delay !== null && delay > 0 ? (
                        <span className="text-destructive font-medium">{delay}d</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canEdit(task) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTask(task)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {task.asset_link && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(task.asset_link!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
        onClose={() => {
          setSelectedTask(null);
          setDialogOpen(false);
        }}
      />
    </>
  );
};
