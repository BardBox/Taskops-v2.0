import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilterState } from "@/components/GlobalFilters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskDialog } from "./TaskDialog";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { SubmitDialog } from "./SubmitDialog";
import { NotesDialog } from "./NotesDialog";
import { TaskCard } from "./TaskCard";
import { KanbanBoard } from "./KanbanBoard";
import { GanttChart } from "./GanttChart";
import { BadgeDropdown } from "./BadgeDropdown";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, LayoutGrid, List, ArrowUpDown, Star, Edit, FileText, Upload, Columns, GanttChartSquare } from "lucide-react";
import { toast } from "sonner";
import { useStatusUrgency } from "@/hooks/useStatusUrgency";
import { canTeamMemberChangeStatus } from "@/utils/roleHelpers";

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
  task_comments?: Array<{ message: string; created_at: string }>;
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
  const [viewMode, setViewMode] = useState<"table" | "cards" | "kanban" | "gantt">("table");
  
  const { statuses, urgencies } = useStatusUrgency();

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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_comments",
        },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters]);


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
    let query = supabase
      .from("tasks")
      .select(`
        *,
        clients(name),
        projects(name),
        assignee:profiles!tasks_assignee_id_fkey(full_name),
        assigned_by:profiles!tasks_assigned_by_id_fkey(full_name),
        task_comments(message, created_at)
      `);
    
    // Team members should only see tasks assigned to them
    if (userRole === "team_member") {
      query = query.eq("assignee_id", userId);
    }
    
    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }

    // Sort comments by created_at descending to get the latest one first
    const tasksWithSortedComments = (data as any || []).map((task: any) => ({
      ...task,
      task_comments: task.task_comments?.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) || []
    }));

    setTasks(tasksWithSortedComments);
  };

  const getStatusColor = (status: string) => {
    const statusItem = statuses.find(s => s.label === status);
    return statusItem?.color || "bg-muted text-muted-foreground";
  };

  const getUrgencyColor = (urgency: string) => {
    const urgencyItem = urgencies.find(u => u.label === urgency);
    return urgencyItem?.color || "bg-muted text-muted-foreground";
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

  const handleTaskClick = (taskId: string) => {
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

  return (
    <>
      {/* View Toggle and Bulk Actions Bar */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg flex-wrap">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            Task Diary
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            White Board
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="gap-2"
          >
            <Columns className="h-4 w-4" />
            Sticky Notes
          </Button>
          <Button
            variant={viewMode === "gantt" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("gantt")}
            className="gap-2"
          >
            <GanttChartSquare className="h-4 w-4" />
            Calendar
          </Button>
        </div>

        {selectedTaskIds.size > 0 && userRole === "project_owner" && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 animate-fade-in">
            <span className="text-sm font-medium">
              {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {/* Task Diary View */}
      {viewMode === "table" && (
        <div className="rounded-lg border bg-card overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow>
                {userRole === "project_owner" && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("date")}>
                  <div className="flex items-center gap-2">
                    Date {sortField === "date" && <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("task")}>
                  <div className="flex items-center gap-2">
                    Task {sortField === "task" && <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("client")}>
                  <div className="flex items-center gap-2">
                    Client {sortField === "client" && <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("project")}>
                  <div className="flex items-center gap-2">
                    Project {sortField === "project" && <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("assignee")}>
                  <div className="flex items-center gap-2">
                    Task Owner {sortField === "assignee" && <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("assigned_by")}>
                  <div className="flex items-center gap-2">
                    PM {sortField === "assigned_by" && <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("deadline")}>
                  <div className="flex items-center gap-2">
                    Deadline {sortField === "deadline" && <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("submission")}>
                  <div className="flex items-center gap-2">
                    Submission {sortField === "submission" && <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("delay")}>
                  <div className="flex items-center gap-2">
                    Delay {sortField === "delay" && <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("status")}>
                  <div className="flex items-center gap-2">
                    Status {sortField === "status" && <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("urgency")}>
                  <div className="flex items-center gap-2">
                    Urgency {sortField === "urgency" && <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const delayDays = calculateDelay(task.deadline, task.actual_delivery, task.status);
                return (
                  <TableRow 
                    key={task.id} 
                    className="cursor-pointer transition-all group"
                    onClick={() => handleTaskClick(task.id)}
                  >
                    {userRole === "project_owner" && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedTaskIds.has(task.id)}
                          onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="relative">
                        <div className="status-indicator" style={{ backgroundColor: getStatusColor(task.status).split(' ')[0].replace('bg-[', '').replace(']', '') }} />
                        {new Date(task.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{task.task_name}</TableCell>
                    <TableCell>{task.clients?.name || "-"}</TableCell>
                    <TableCell>{task.projects?.name || "-"}</TableCell>
                    <TableCell>{task.assignee?.full_name || "-"}</TableCell>
                    <TableCell>{task.assigned_by?.full_name || "-"}</TableCell>
                    <TableCell>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      {task.actual_delivery ? new Date(task.actual_delivery).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      {delayDays !== null ? (
                        <span className={delayDays > 0 ? "text-destructive font-medium" : delayDays < 0 ? "text-green-600 font-medium" : ""}>
                          {delayDays > 0 ? `+${delayDays}d` : delayDays < 0 ? `${delayDays}d` : "On time"}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <BadgeDropdown
                        value={task.status}
                        options={
                          userRole === "team_member"
                            ? statuses.filter(s => ["Not Started", "In Progress", "Waiting for Approval"].includes(s.label))
                            : statuses
                        }
                        onChange={(value) => handleStatusChange(task.id, value)}
                        disabled={!canEdit(task) || (userRole === "team_member" && !canTeamMemberChangeStatus(task.status))}
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <BadgeDropdown
                        value={task.urgency}
                        options={urgencies}
                        onChange={(value) => handleUrgencyChange(task.id, value)}
                        disabled={!canEdit(task) || userRole === "team_member"}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity slide-in-actions">
                        {userRole !== "project_manager" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => toggleAppreciation(task.id, e)}
                            className="h-8 w-8 p-0"
                          >
                            <Star className={`h-4 w-4 ${taskAppreciations.get(task.id) ? "fill-yellow-400 text-yellow-400" : ""}`} />
                          </Button>
                        )}
                        {canEdit(task) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTask(task);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNotesDialog(task);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {task.assignee_id === userId && task.status !== "Approved" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSubmitDialog(task);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* White Board View */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {filteredTasks.map((task, index) => (
            <div 
              key={task.id}
              style={{ 
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'both'
              }}
              className="animate-fade-in-up"
            >
              <TaskCard
                task={task}
                userRole={userRole}
                isSelected={selectedTaskIds.has(task.id)}
                isAppreciated={taskAppreciations.get(task.id)}
                statuses={
                  userRole === "team_member"
                    ? statuses.filter(s => ["Not Started", "In Progress", "Waiting for Approval"].includes(s.label))
                    : statuses
                }
                urgencies={urgencies}
                onSelect={(checked) => handleSelectTask(task.id, checked)}
                onEdit={() => handleEditTask(task)}
                onClick={() => handleTaskClick(task.id)}
                onStatusChange={
                  userRole === "team_member" && task.status && !canTeamMemberChangeStatus(task.status)
                    ? undefined
                    : (newStatus) => handleStatusChange(task.id, newStatus)
                }
                onUrgencyChange={userRole !== "team_member" ? (newUrgency) => handleUrgencyChange(task.id, newUrgency) : undefined}
                onAppreciationToggle={(e) => toggleAppreciation(task.id, e)}
                onSubmit={() => {
                  setSelectedTaskForSubmit(task);
                  setSubmitDialogOpen(true);
                }}
                onNotesClick={() => {
                  setSelectedTask(task);
                  setNotesDialogOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Sticky Notes View */}
      {viewMode === "kanban" && (
        <KanbanBoard
          tasks={filteredTasks}
          userRole={userRole}
          userId={userId}
          statuses={statuses}
          urgencies={urgencies}
          selectedTaskIds={selectedTaskIds}
          taskAppreciations={taskAppreciations}
          onTaskClick={handleTaskClick}
          onSelectTask={handleSelectTask}
          onEditTask={handleEditTask}
          onStatusChange={
            userRole === "team_member" 
              ? (taskId: string, newStatus: string) => {
                  const task = tasks.find(t => t.id === taskId);
                  if (task && canTeamMemberChangeStatus(task.status)) {
                    const allowedStatuses = ["Not Started", "In Progress", "Waiting for Approval"];
                    if (allowedStatuses.includes(newStatus)) {
                      handleStatusChange(taskId, newStatus);
                    }
                  }
                }
              : handleStatusChange
          }
          onUrgencyChange={userRole !== "team_member" ? handleUrgencyChange : () => {}}
          onAppreciationToggle={toggleAppreciation}
          onSubmit={(task) => {
            setSelectedTaskForSubmit(task);
            setSubmitDialogOpen(true);
          }}
          onNotesClick={(task) => {
            setSelectedTask(task);
            setNotesDialogOpen(true);
          }}
        />
      )}

      {/* Calendar View */}
      {viewMode === "gantt" && (
        <GanttChart
          tasks={filteredTasks}
          statuses={statuses}
          onTaskClick={handleTaskClick}
        />
      )}

      {filteredTasks.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
            <Trash2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or create a new task to get started.
          </p>
        </div>
      )}

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
