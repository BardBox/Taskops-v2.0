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
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskDialog } from "./TaskDialog";
import { SubmitDialog } from "./SubmitDialog";
import { Edit2, ExternalLink, FileText, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

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
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedTaskForSubmit, setSelectedTaskForSubmit] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [highlightToday, setHighlightToday] = useState(false);

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
    // Use submission date if exists, otherwise use current date
    const compareDate = actualDelivery ? new Date(actualDelivery) : new Date();
    const diffTime = compareDate.getTime() - deadlineDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  };

  const getFilteredAndSortedTasks = () => {
    let filtered = [...tasks];

    // Apply year filter
    if (filterYear !== "all") {
      filtered = filtered.filter(task => {
        const taskYear = new Date(task.date).getFullYear().toString();
        return taskYear === filterYear;
      });
    }

    // Apply month filter
    if (filterMonth !== "all") {
      filtered = filtered.filter(task => {
        const taskMonth = (new Date(task.date).getMonth() + 1).toString();
        return taskMonth === filterMonth;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case "urgency":
          const urgencyOrder = { "Immediate": 4, "High": 3, "Mid": 2, "Low": 1 };
          compareValue = urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder];
          break;
        case "status":
          compareValue = a.status.localeCompare(b.status);
          break;
        case "deadline":
          const aDeadline = a.deadline ? new Date(a.deadline).getTime() : 0;
          const bDeadline = b.deadline ? new Date(b.deadline).getTime() : 0;
          compareValue = aDeadline - bDeadline;
          break;
        case "date":
          compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        default:
          compareValue = 0;
      }

      return sortDirection === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  };

  const getAvailableYears = () => {
    const years = tasks.map(task => new Date(task.date).getFullYear());
    return Array.from(new Set(years)).sort((a, b) => b - a);
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
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
    // Optimistically update local state
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update status");
      console.error("Error updating status:", error);
      // Revert on error
      fetchTasks();
    } else {
      toast.success("Status updated");
    }
  };

  const handleUrgencyChange = async (taskId: string, newUrgency: string) => {
    // Optimistically update local state
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, urgency: newUrgency } : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({ urgency: newUrgency })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update urgency");
      console.error("Error updating urgency:", error);
      // Revert on error
      fetchTasks();
    } else {
      toast.success("Urgency updated");
    }
  };

  const filteredTasks = getFilteredAndSortedTasks();
  
  const isToday = (date: string | null) => {
    if (!date) return false;
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  const handleOpenSubmitDialog = (taskId: string) => {
    setSelectedTaskForSubmit(taskId);
    setSubmitDialogOpen(true);
  };

  return (
    <>
      <div className="mb-4 flex gap-4 flex-wrap items-center justify-between">
        <div className="flex gap-4 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Year:</span>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">All</SelectItem>
              {getAvailableYears().map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Month:</span>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="1">January</SelectItem>
              <SelectItem value="2">February</SelectItem>
              <SelectItem value="3">March</SelectItem>
              <SelectItem value="4">April</SelectItem>
              <SelectItem value="5">May</SelectItem>
              <SelectItem value="6">June</SelectItem>
              <SelectItem value="7">July</SelectItem>
              <SelectItem value="8">August</SelectItem>
              <SelectItem value="9">September</SelectItem>
              <SelectItem value="10">October</SelectItem>
              <SelectItem value="11">November</SelectItem>
              <SelectItem value="12">December</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort by:</span>
          <Select value={sortField} onValueChange={setSortField}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="date">Date Created</SelectItem>
              <SelectItem value="urgency">Urgency</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            {sortDirection === "asc" ? "Asc" : "Desc"}
          </Button>
        </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            id="highlight-today"
            checked={highlightToday}
            onCheckedChange={setHighlightToday}
          />
          <Label htmlFor="highlight-today" className="text-sm font-medium cursor-pointer">
            Highlight Today
          </Label>
        </div>
      </div>

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
              <TableHead>Submission</TableHead>
              <TableHead>Delay</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  No tasks found matching the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => {
                const delay = calculateDelay(task.deadline, task.actual_delivery, task.status);
                const shouldHighlight = highlightToday && isToday(task.deadline);
                return (
                  <TableRow 
                    key={task.id}
                    className={shouldHighlight ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}
                  >
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
                      {task.actual_delivery ? format(new Date(task.actual_delivery), "MMM dd") : "-"}
                    </TableCell>
                    <TableCell>
                      {delay !== null && delay > 0 ? (
                        <span className="text-destructive font-medium">{delay}d</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={task.status !== "Done"}
                        onClick={() => handleOpenSubmitDialog(task.id)}
                      >
                        Submit
                      </Button>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
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
                          {task.notes && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{task.notes}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>
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
      
      <SubmitDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        taskId={selectedTaskForSubmit || ""}
        onSuccess={() => {
          fetchTasks();
          setSelectedTaskForSubmit(null);
        }}
      />
    </>
  );
};
