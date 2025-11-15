import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilterState } from "@/components/GlobalFilters";
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
import { Checkbox } from "@/components/ui/checkbox";
import { TaskDialog } from "./TaskDialog";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { SubmitDialog } from "./SubmitDialog";
import { NotesDialog } from "./NotesDialog";
import { Edit2, ExternalLink, FileText, ArrowUp, ArrowDown, Star, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface Task {
  id: string;
  date: string;
  task_name: string;
  client_id: string | null;
  project_id: string | null;
  assignee_id: string;
  assigned_by_id: string;
  deadline: string | null;
  actual_delivery: string | null;
  status: string;
  urgency: string;
  asset_link: string | null;
  notes: string | null;
  reference_link_1: string | null;
  reference_link_2: string | null;
  reference_link_3: string | null;
  clients: { name: string } | null;
  projects: { name: string } | null;
  assignee: { full_name: string } | null;
  assigned_by: { full_name: string } | null;
}

interface TaskTableProps {
  userRole: string;
  userId: string;
  filters?: FilterState;
}

export const TaskTable = ({ userRole, userId, filters }: TaskTableProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedTaskForSubmit, setSelectedTaskForSubmit] = useState<Task | null>(null);
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [taskAppreciations, setTaskAppreciations] = useState<Map<string, boolean>>(new Map());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTasks();
    fetchAppreciations();

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

  const fetchAppreciations = async () => {
    const { data } = await supabase
      .from("task_appreciations" as any)
      .select("task_id, given_by_id")
      .eq("given_by_id", userId);
      
    const appreciationMap = new Map<string, boolean>();
    data?.forEach((app: any) => {
      appreciationMap.set(app.task_id, true);
    });
    setTaskAppreciations(appreciationMap);
  };

  const toggleAppreciation = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // PMs can't give appreciation
    if (userRole === "project_manager") {
      toast.error("Project Managers cannot give appreciation");
      return;
    }
    
    const hasAppreciation = taskAppreciations.get(taskId);
    
    if (hasAppreciation) {
      const { error } = await supabase
        .from("task_appreciations" as any)
        .delete()
        .eq("task_id", taskId)
        .eq("given_by_id", userId);
        
      if (!error) {
        const newMap = new Map(taskAppreciations);
        newMap.delete(taskId);
        setTaskAppreciations(newMap);
        toast.success("Appreciation removed");
      }
    } else {
      const { error } = await supabase
        .from("task_appreciations" as any)
        .insert({ task_id: taskId, given_by_id: userId } as any);
        
      if (!error) {
        const newMap = new Map(taskAppreciations);
        newMap.set(taskId, true);
        setTaskAppreciations(newMap);
        toast.success("Star added!");
      }
    }
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        clients(name),
        projects(name),
        assignee:profiles!tasks_assignee_id_fkey(full_name),
        assigned_by:profiles!tasks_assigned_by_id_fkey(full_name)
      `)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }

    setTasks(data as any || []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "To Do":
        return "bg-status-todo text-status-todo-foreground";
      case "Doing":
        return "bg-status-doing text-status-doing-foreground";
      case "Done":
        return "bg-status-done text-status-done-foreground";
      case "Approved":
        return "bg-status-approved text-status-approved-foreground";
      case "On Hold":
        return "bg-status-hold text-status-hold-foreground";
      default:
        return "bg-status-todo text-status-todo-foreground";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Immediate":
        return "bg-urgency-immediate text-urgency-immediate-foreground";
      case "High":
        return "bg-urgency-high text-urgency-high-foreground";
      case "Mid":
        return "bg-urgency-medium text-urgency-medium-foreground";
      case "Low":
        return "bg-urgency-low text-urgency-low-foreground";
      default:
        return "bg-urgency-low text-urgency-low-foreground";
    }
  };

  const calculateDelay = (deadline: string | null, actualDelivery: string | null, status: string) => {
    if (status === "Cancelled") return null;
    if (!deadline) return null;

    const deadlineDate = new Date(deadline);
    const compareDate = actualDelivery ? new Date(actualDelivery) : new Date();
    const diffTime = compareDate.getTime() - deadlineDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Only show delay if submission happened OR current date is past deadline
    if (!actualDelivery && diffDays <= 0) return null;

    return diffDays;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortableHeader = ({ field, label }: { field: string; label: string }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        )}
      </div>
    </TableHead>
  );

  const handleRowClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setDetailDialogOpen(true);
  };

  const getFilteredAndSortedTasks = () => {
    let filtered = [...tasks];

    if (filters) {
      // Apply year filter
      if (filters.year !== "all") {
        filtered = filtered.filter(task => {
          const taskYear = new Date(task.date).getFullYear().toString();
          return taskYear === filters.year;
        });
      }

      // Apply month filter
      if (filters.month !== "all") {
        filtered = filtered.filter(task => {
          const taskMonth = (new Date(task.date).getMonth() + 1).toString();
          return taskMonth === filters.month;
        });
      }

      // Apply status filter
      if (filters.status !== "all") {
        filtered = filtered.filter(task => task.status === filters.status);
      }

      // Apply urgency filter
      if (filters.urgency !== "all") {
        filtered = filtered.filter(task => task.urgency === filters.urgency);
      }

      // Apply client filter
      if (filters.clientId !== "all") {
        filtered = filtered.filter(task => task.client_id === filters.clientId);
      }

      // Apply team member filter
      if (filters.teamMemberId !== "all") {
        filtered = filtered.filter(task => task.assignee_id === filters.teamMemberId);
      }

      // Apply PM filter
      if (filters.projectManagerId !== "all") {
        filtered = filtered.filter(task => task.assigned_by_id === filters.projectManagerId);
      }

      // Apply delay filter
      if (filters.delay !== "all") {
        filtered = filtered.filter(task => {
          const delayDays = calculateDelay(task.deadline, task.actual_delivery, task.status);
          if (delayDays === null) return false;
          
          switch (filters.delay) {
            case "on-time":
              return delayDays === 0;
            case "early":
              return delayDays < 0;
            case "delayed":
              return delayDays > 0;
            default:
              return true;
          }
        });
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case "client":
          const aClient = a.clients?.name || "";
          const bClient = b.clients?.name || "";
          compareValue = aClient.localeCompare(bClient);
          break;
        case "assignee":
          const aAssignee = a.assignee?.full_name || "";
          const bAssignee = b.assignee?.full_name || "";
          compareValue = aAssignee.localeCompare(bAssignee);
          break;
        case "assigned_by":
          const aAssignedBy = a.assigned_by?.full_name || "";
          const bAssignedBy = b.assigned_by?.full_name || "";
          compareValue = aAssignedBy.localeCompare(bAssignedBy);
          break;
        case "urgency":
          const urgencyOrder = { "Immediate": 4, "High": 3, "Medium": 2, "Low": 1 };
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
        case "submission":
          const aSubmission = a.actual_delivery ? new Date(a.actual_delivery).getTime() : 0;
          const bSubmission = b.actual_delivery ? new Date(b.actual_delivery).getTime() : 0;
          compareValue = aSubmission - bSubmission;
          break;
        case "delay":
          const aDelay = calculateDelay(a.deadline, a.actual_delivery, a.status) || 0;
          const bDelay = calculateDelay(b.deadline, b.actual_delivery, b.status) || 0;
          compareValue = aDelay - bDelay;
          break;
        case "date":
          compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "task":
          compareValue = a.task_name.localeCompare(b.task_name);
          break;
        case "project":
          const aProject = a.projects?.name || "";
          const bProject = b.projects?.name || "";
          compareValue = aProject.localeCompare(bProject);
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

  const handleOpenSubmitDialog = (task: Task) => {
    setSelectedTaskForSubmit(task);
    setSubmitDialogOpen(true);
  };

  const handleOpenNotesDialog = (task: Task) => {
    setSelectedTask(task);
    setNotesDialogOpen(true);
  };

  const canEdit = (task: Task) => {
    if (userRole === "project_owner") return true;
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

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSelectedTaskIds = new Set(selectedTaskIds);
    if (checked) {
      newSelectedTaskIds.add(taskId);
    } else {
      newSelectedTaskIds.delete(taskId);
    }
    setSelectedTaskIds(newSelectedTaskIds);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allTaskIds = new Set(filteredTasks.map(task => task.id));
      setSelectedTaskIds(allTaskIds);
    } else {
      setSelectedTaskIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTaskIds.size === 0) {
      toast.error("No tasks selected");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedTaskIds.size} task(s)?`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .in("id", Array.from(selectedTaskIds));

    if (error) {
      toast.error("Failed to delete tasks");
      console.error("Error deleting tasks:", error);
    } else {
      toast.success(`${selectedTaskIds.size} task(s) deleted successfully`);
      setSelectedTaskIds(new Set());
      fetchTasks();
    }
  };

  const filteredTasks = getFilteredAndSortedTasks();
  
  const isToday = (date: string | null) => {
    if (!date) return false;
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {userRole === "project_owner" && (
                <TableHead className="w-[80px]">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    {selectedTaskIds.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteSelected}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableHead>
              )}
              <SortableHeader field="date" label="Date" />
              <SortableHeader field="task" label="Task" />
              <SortableHeader field="client" label="Client" />
              <SortableHeader field="project" label="Project" />
              <SortableHeader field="assignee" label="Assignee" />
              <SortableHeader field="assigned_by" label="Assigned By" />
              <SortableHeader field="deadline" label="Deadline" />
              <SortableHeader field="status" label="Status" />
              <SortableHeader field="urgency" label="Urgency" />
              <SortableHeader field="submission" label="Submission" />
              <SortableHeader field="delay" label="Delay" />
              <TableHead>Preview</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={userRole === "project_owner" ? 14 : 13} className="text-center py-8 text-muted-foreground">
                  No tasks found matching the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => {
                const delay = calculateDelay(task.deadline, task.actual_delivery, task.status);
                const shouldHighlight = filters?.highlightToday && isToday(task.deadline);
                return (
                  <TableRow 
                    key={task.id}
                    className={`${shouldHighlight ? "bg-secondary/10" : ""} cursor-pointer hover:bg-muted/50 transition-colors`}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setDetailDialogOpen(true);
                    }}
                  >
                    {userRole === "project_owner" && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedTaskIds.has(task.id)}
                          onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(task.date), "MMM dd")}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{task.task_name}</span>
                        {(userRole === "project_owner" || userRole === "project_manager") && (
                          <button
                            onClick={(e) => toggleAppreciation(task.id, e)}
                            className="flex-shrink-0 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`h-4 w-4 ${
                                taskAppreciations.get(task.id)
                                  ? "fill-star text-star"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{task.clients?.name || "-"}</TableCell>
                    <TableCell>{task.projects?.name || "-"}</TableCell>
                    <TableCell>{task.assignee?.full_name || "-"}</TableCell>
                    <TableCell>{task.assigned_by?.full_name || "-"}</TableCell>
                    <TableCell>
                      {task.deadline ? format(new Date(task.deadline), "MMM dd") : "-"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                            <SelectItem value="Needs Review">Needs Review</SelectItem>
                            <SelectItem value="Blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                            <SelectItem value="Medium">Medium</SelectItem>
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
                      {delay !== null ? (
                        <span className={`font-medium ${delay < 0 ? 'text-notification-success' : 'text-destructive'}`}>
                          {delay}d
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={task.status !== "Done"}
                        onClick={() => handleOpenSubmitDialog(task)}
                      >
                        Submit
                      </Button>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                        {(task.notes || task.reference_link_1 || task.reference_link_2 || task.reference_link_3) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenNotesDialog(task)}
                          >
                            <FileText className="h-4 w-4" />
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
        userRole={userRole}
        onClose={() => {
          setSelectedTask(null);
          fetchTasks();
        }}
      />

      <TaskDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        taskId={selectedTaskId}
        userRole={userRole}
        userId={userId}
      />
      
      <SubmitDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        taskId={selectedTaskForSubmit?.id || ""}
        existingAssetLink={selectedTaskForSubmit?.asset_link}
        onSuccess={() => {
          fetchTasks();
          setSelectedTaskForSubmit(null);
        }}
      />

      <NotesDialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        notes={selectedTask?.notes || null}
        referenceLink1={selectedTask?.reference_link_1 || null}
        referenceLink2={selectedTask?.reference_link_2 || null}
        referenceLink3={selectedTask?.reference_link_3 || null}
        taskName={selectedTask?.task_name || ""}
      />
    </>
  );
};
