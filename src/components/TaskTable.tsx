import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilterState } from "@/components/GlobalFilters";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskDialog } from "./TaskDialog";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { SubmitDialog } from "./SubmitDialog";
import { NotesDialog } from "./NotesDialog";
import { TaskCard } from "./TaskCard";
import { KanbanBoard } from "./KanbanBoard";
import { GanttChart } from "./GanttChart";
import { BadgeDropdown } from "./BadgeDropdown";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, Star, Edit, FileText, Upload, Columns, GanttChartSquare, Users, Plus, Settings, Timer, RotateCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useStatusUrgency } from "@/hooks/useStatusUrgency";
import { DashboardCustomization, DashboardPreferences } from "./DashboardCustomization";
import { canTeamMemberChangeStatus } from "@/utils/roleHelpers";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMultipleTasksTimeTracking, formatTimeTracking } from "@/hooks/useTaskTimeTracking";

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
  revision_count: number;
  revision_requested_at: string | null;
  revision_requested_by: string | null;
  is_posted?: boolean;
  posted_at?: string | null;
  posted_by?: string | null;
  clients: { name: string } | null;
  projects: { name: string } | null;
  assignee: { full_name: string; avatar_url: string | null } | null;
  assigned_by: { full_name: string; avatar_url: string | null } | null;
  task_comments?: Array<{ message: string; created_at: string }>;
  collaborators?: Array<{ user_id: string; profiles: { full_name: string; avatar_url: string | null } }>;
}

interface VisibleColumns {
  date: boolean;
  client: boolean;
  project: boolean;
  taskOwner: boolean;
  pm: boolean;
  deadline: boolean;
  submission: boolean;
  delay: boolean;
  time: boolean;
  collaborators: boolean;
  status: boolean;
  urgency: boolean;
}

interface ColumnWidths {
  date: number;
  task: number;
  client: number;
  project: number;
  taskOwner: number;
  pm: number;
  collaborators: number;
  deadline: number;
  submission: number;
  delay: number;
  time: number;
  status: number;
  urgency: number;
}

export const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  date: 100,
  task: 200,
  client: 120,
  project: 120,
  taskOwner: 140,
  pm: 130,
  collaborators: 60,
  deadline: 110,
  submission: 110,
  delay: 80,
  time: 80,
  status: 130,
  urgency: 110,
};

interface TaskTableProps {
  userRole: string;
  userId: string;
  filters?: FilterState;
  onDuplicate?: (data: any) => void;
  visibleColumns?: VisibleColumns;
  canCreateTasks?: boolean;
  onCreateTask?: () => void;
  preferences?: DashboardPreferences;
  onPreferencesChange?: (preferences: DashboardPreferences) => void;
  onResetPreferences?: () => void;
  columnWidths?: ColumnWidths;
  onColumnWidthsChange?: (widths: ColumnWidths) => void;
}

export const TaskTable = ({ userRole, userId, filters, onDuplicate, visibleColumns, canCreateTasks, onCreateTask, preferences, onPreferencesChange, onResetPreferences, columnWidths: externalColumnWidths, onColumnWidthsChange }: TaskTableProps) => {
  const columns = visibleColumns ?? {
    date: true,
    client: true,
    project: true,
    taskOwner: true,
    pm: true,
    deadline: true,
    submission: true,
    delay: true,
    time: true,
    collaborators: true,
    status: true,
    urgency: true,
  };

  const [internalColumnWidths, setInternalColumnWidths] = useState<ColumnWidths>(DEFAULT_COLUMN_WIDTHS);
  const columnWidths = externalColumnWidths ?? internalColumnWidths;
  const setColumnWidths = (widths: ColumnWidths | ((prev: ColumnWidths) => ColumnWidths)) => {
    if (typeof widths === 'function') {
      const newWidths = widths(columnWidths);
      setInternalColumnWidths(newWidths);
      onColumnWidthsChange?.(newWidths);
    } else {
      setInternalColumnWidths(widths);
      onColumnWidthsChange?.(widths);
    }
  };

  const [resizingColumn, setResizingColumn] = useState<keyof ColumnWidths | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleResizeStart = (column: keyof ColumnWidths, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(column);
    setStartX(e.clientX);
    setStartWidth(columnWidths[column]);
  };

  // Render resize handle for column headers
  const renderResizeHandle = (column: keyof ColumnWidths) => (
    <div
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 opacity-0 group-hover/col:opacity-100 transition-opacity"
      onMouseDown={(e) => handleResizeStart(column, e)}
      onClick={(e) => e.stopPropagation()}
    />
  );

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, startX, startWidth]);
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
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"table" | "cards" | "kanban" | "gantt">(isMobile ? "cards" : "table");
  const [notifiedTaskIds, setNotifiedTaskIds] = useState<Set<string>>(new Set());
  const [collaboratorsExpanded, setCollaboratorsExpanded] = useState(false);

  // Update view mode when mobile state changes
  useEffect(() => {
    if (isMobile && viewMode === "table") {
      setViewMode("cards");
    }
  }, [isMobile]);

  const { statuses, urgencies } = useStatusUrgency();

  // Get task IDs for time tracking
  const taskIds = tasks.map(t => t.id);
  const { getTaskTotalTime, isTaskActive } = useMultipleTasksTimeTracking(taskIds);

  const toggleCollaboratorsColumn = () => {
    setCollaboratorsExpanded(prev => !prev);
  };

  useEffect(() => {
    fetchTasks();
    fetchAppreciations();
    fetchNotifications();

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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters, userRole, userId]);


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

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("task_id")
      .eq("user_id", userId);

    const notifiedIds = new Set<string>();
    data?.forEach((notif) => {
      if (notif.task_id) {
        notifiedIds.add(notif.task_id);
      }
    });
    setNotifiedTaskIds(notifiedIds);
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
        assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url, creative_title),
        assigned_by:profiles!tasks_assigned_by_id_fkey(full_name, avatar_url, creative_title),
        task_comments(message, created_at),
        task_collaborators(user_id, profiles!task_collaborators_user_id_fkey(full_name, avatar_url))
      `);

    // Note: Team members can now see all tasks (via RLS) for self-assignment
    // The RLS policies handle the security restrictions

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }

    // Sort comments by created_at descending to get the latest one first
    let processedTasks = (data as any || []).map((task: any) => ({
      ...task,
      task_comments: task.task_comments?.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) || [],
      collaborators: task.task_collaborators || []
    }));

    // STRICT FILTERING: SECURE BY DEFAULT
    // Only Project Managers and Owners can see all tasks.
    // Everyone else (Team Members, or if role is loading/undefined) sees ONLY their assigned/collaborating tasks.
    const isManagerOrOwner = userRole === "project_manager" || userRole === "project_owner";

    if (!isManagerOrOwner) {
      processedTasks = processedTasks.filter((task: any) =>
        (userId && task.assignee_id === userId) ||
        (userId && task.collaborators?.some((c: any) => c.user_id === userId))
      );
    }

    // Extract all user IDs including collaborators and fetch roles
    const userIds = new Set<string>();
    processedTasks.forEach((task: any) => {
      if (task.assignee_id) userIds.add(task.assignee_id);
      if (task.assigned_by_id) userIds.add(task.assigned_by_id);
      task.collaborators?.forEach((c: any) => {
        if (c.user_id) userIds.add(c.user_id);
      });
    });

    setTasks(processedTasks);
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

  const handleSelfAssign = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ assignee_id: userId })
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Task assigned to you successfully!");
      fetchTasks();
    } catch (error: any) {
      console.error("Error self-assigning task:", error);
      toast.error("Failed to assign task");
    }
  };

  const getTaskHighlightClass = (task: Task, delayDays: number | null) => {
    if (!filters) return "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filters.highlightToday) {
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        deadline.setHours(0, 0, 0, 0);
        const isDeadlineToday = deadline.getTime() === today.getTime();
        const isOverdue = deadline.getTime() < today.getTime() && !["Approved", "Cancelled"].includes(task.status);

        if (isDeadlineToday || isOverdue) {
          return "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/30";
        }
      }
    }

    if (filters.highlightImmediate && task.urgency === "Immediate") {
      return "bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-950/30";
    }

    if (filters.highlightDelayed && delayDays !== null && delayDays > 0) {
      return "bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-950/30";
    }

    if (filters.highlightInApproval && task.status === "In Approval") {
      return "bg-green-50/50 dark:bg-green-950/20 hover:bg-green-100/50 dark:hover:bg-green-950/30";
    }

    return "";
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

      // Apply project name filter
      if (filters.projectName !== "all") {
        filtered = filtered.filter(task => task.projects?.name === filters.projectName);
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

      // Apply quick filter
      if (filters.quickFilter && filters.quickFilter.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Apply time-based filter first (today, 7-days, 30-days, or this-month)
        const hasToday = filters.quickFilter.includes("today");
        const has7Days = filters.quickFilter.includes("7-days");
        const has30Days = filters.quickFilter.includes("30-days");
        const hasThisMonth = filters.quickFilter.includes("this-month");

        if (hasToday) {
          filtered = filtered.filter(task => {
            const taskDate = new Date(task.date);
            taskDate.setHours(0, 0, 0, 0);
            const isToday = taskDate.getTime() === today.getTime();
            const isPending = !["Approved", "Cancelled"].includes(task.status);
            return isToday || isPending;
          });
        } else if (has7Days) {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          filtered = filtered.filter(task => {
            const taskDate = new Date(task.date);
            taskDate.setHours(0, 0, 0, 0);
            const isWithin7Days = taskDate >= sevenDaysAgo && taskDate <= today;
            const isPending = !["Approved", "Cancelled"].includes(task.status);
            return isWithin7Days || isPending;
          });
        } else if (has30Days) {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          filtered = filtered.filter(task => {
            const taskDate = new Date(task.date);
            taskDate.setHours(0, 0, 0, 0);
            const isWithin30Days = taskDate >= thirtyDaysAgo && taskDate <= today;
            const isPending = !["Approved", "Cancelled"].includes(task.status);
            return isWithin30Days || isPending;
          });
        } else if (hasThisMonth) {
          filtered = filtered.filter(task => {
            const taskDate = new Date(task.date);
            const isThisMonth = taskDate.getMonth() === today.getMonth() &&
              taskDate.getFullYear() === today.getFullYear();
            const isPending = !["Approved", "Cancelled"].includes(task.status);
            return isThisMonth || isPending;
          });
        }

        // Apply additive filters (urgent, revisions, and pending)
        if (filters.quickFilter.includes("urgent")) {
          filtered = filtered.filter(task => task.urgency === "Immediate");
        }

        if (filters.quickFilter.includes("revisions")) {
          filtered = filtered.filter(task => task.revision_count > 0);
        }

        if (filters.quickFilter.includes("pending")) {
          filtered = filtered.filter(task => ["Not Started", "In Progress", "Doing"].includes(task.status));
        }

        if (filters.quickFilter.includes("notified")) {
          filtered = filtered.filter(task => notifiedTaskIds.has(task.id));
        }

        // Handle exclusive filters (my-tasks, most-busy, least-busy)
        if (filters.quickFilter.includes("my-tasks")) {
          filtered = filtered.filter(task =>
            task.assignee_id === userId || task.assigned_by_id === userId
          );
        } else if (filters.quickFilter.includes("most-busy") || filters.quickFilter.includes("least-busy")) {
          // These filters only work for PM/PO
          // We need to find the team member with most/least pending tasks
          const pendingTasksByMember = new Map<string, number>();

          // Count pending tasks per team member
          tasks.forEach(task => {
            if (!["Approved", "Cancelled"].includes(task.status)) {
              const count = pendingTasksByMember.get(task.assignee_id) || 0;
              pendingTasksByMember.set(task.assignee_id, count + 1);
            }
          });

          if (pendingTasksByMember.size > 0) {
            const sortedMembers = Array.from(pendingTasksByMember.entries())
              .sort((a, b) => b[1] - a[1]);

            const targetMemberId = filters.quickFilter.includes("most-busy")
              ? sortedMembers[0][0]
              : sortedMembers[sortedMembers.length - 1][0];

            filtered = filtered.filter(task => task.assignee_id === targetMemberId);
          }
        }
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
    if (!["project_manager", "project_owner", "team_member"].includes(userRole)) {
      toast.error("You do not have permission to change status");
      return;
    }
    // Team members can only change their own tasks (checked via canEdit or RLS, but explicit check here is safer)
    if (userRole === "team_member") {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.assignee_id !== userId) {
        toast.error("You can only update your own tasks");
        return;
      }
    }

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
    if (!["project_manager", "project_owner"].includes(userRole)) {
      toast.error("You do not have permission to change urgency");
      return;
    }

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

  const viewModeOptions = [
    { value: "table", label: "Task Diary", icon: List },
    { value: "cards", label: "White Board", icon: LayoutGrid },
    { value: "kanban", label: "Sticky Notes", icon: Columns },
    { value: "gantt", label: "Calendar", icon: GanttChartSquare },
  ];

  return (
    <>
      {/* View Toggle and Bulk Actions Bar - Sticky */}
      <div className="sticky top-[5.5rem] z-30 bg-background py-2 -mx-3 md:-mx-4 px-3 md:px-4 mb-2 flex items-center justify-between gap-2 md:gap-4 flex-wrap border-b border-border/30">
        {/* Mobile: Dropdown | Desktop: Button Grid */}
        {isMobile ? (
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <SelectTrigger className="w-full max-w-[200px] h-10">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {(() => {
                    const current = viewModeOptions.find(o => o.value === viewMode);
                    const Icon = current?.icon || List;
                    return (
                      <>
                        <Icon className="h-4 w-4" />
                        <span>{current?.label}</span>
                      </>
                    );
                  })()}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {viewModeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ) : (
          <div className="bg-muted/50 rounded-lg p-1 grid grid-cols-4 gap-1 w-full max-w-3xl">
            {viewModeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  variant={viewMode === option.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(option.value as typeof viewMode)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          {canCreateTasks && onCreateTask && (
            <Button
              onClick={onCreateTask}
              size="icon"
              className="h-10 w-10 rounded-full bg-foreground hover:bg-foreground/90 text-background"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}

          {onResetPreferences && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => {
                      onResetPreferences();
                      toast.success("Dashboard reset to defaults");
                    }}
                    size="icon"
                    className="h-10 w-10 rounded-full bg-foreground hover:bg-foreground/90 text-background"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset to Defaults</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {preferences && onPreferencesChange && (
            <DashboardCustomization
              userId={userId}
              preferences={preferences}
              onPreferencesChange={onPreferencesChange}
            />
          )}
        </div>

        {selectedTaskIds.size > 0 && userRole === "project_owner" && (
          <div className="flex items-center gap-2 md:gap-3 bg-primary/5 border border-primary/20 rounded-lg px-3 md:px-4 py-2 animate-fade-in w-full md:w-auto">
            <span className="text-xs md:text-sm font-medium">
              {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              className="text-xs md:text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        )}
      </div>

      {/* Task Diary View */}
      {viewMode === "table" && (
        <div className="rounded-lg border bg-card animate-fade-in relative group/scroll">
          {/* Scroll edge indicators */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card/80 to-transparent opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 z-10" />
          <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-card/60 to-transparent opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 z-10" />
          <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-6 bg-gradient-to-l from-card/60 to-transparent opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 z-10" />
          <div className="overflow-auto max-h-[70vh]">
            <Table className="table-fixed">
              <TableHeader className="sticky top-0 z-20 bg-card">
                <TableRow className="hover:bg-transparent bg-card border-b-2 border-primary/30 relative after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-[-4px] after:h-[4px] after:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.15)] after:pointer-events-none">
                  {userRole === "project_owner" && (
                    <TableHead className="w-12 bg-card">
                      <Checkbox
                        checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  {columns.date && (
                    <TableHead
                      style={{ width: columnWidths.date }}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors bg-card relative group/col"
                      onClick={() => toggleSort("date")}
                    >
                      <div className="flex items-center gap-2">
                        Date
                        {sortField === "date" && (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {renderResizeHandle('date')}
                    </TableHead>
                  )}
                  <TableHead
                    style={{ width: columnWidths.task }}
                    className="cursor-pointer hover:bg-secondary/30 transition-colors bg-card relative group/col"
                    onClick={() => toggleSort("task")}
                  >
                    <div className="flex items-center gap-2">
                      Task
                      {sortField === "task" && (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    {renderResizeHandle('task')}
                  </TableHead>
                  {columns.client && (
                    <TableHead
                      style={{ width: columnWidths.client }}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors bg-card relative group/col"
                      onClick={() => toggleSort("client")}
                    >
                      <div className="flex items-center gap-2">
                        Client
                        {sortField === "client" && (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {renderResizeHandle('client')}
                    </TableHead>
                  )}
                  {columns.project && (
                    <TableHead
                      style={{ width: columnWidths.project }}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors bg-card relative group/col"
                      onClick={() => toggleSort("project")}
                    >
                      <div className="flex items-center gap-2">
                        Project
                        {sortField === "project" && (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {renderResizeHandle('project')}
                    </TableHead>
                  )}
                  {columns.taskOwner && userRole !== "team_member" && (
                    <TableHead
                      style={{ width: columnWidths.taskOwner }}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors bg-card relative group/col"
                      onClick={() => toggleSort("assignee")}
                    >
                      <div className="flex items-center gap-2">
                        Task Owner
                        {sortField === "assignee" && (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {renderResizeHandle('taskOwner')}
                    </TableHead>
                  )}
                  {columns.pm && (
                    <TableHead
                      style={{ width: columnWidths.pm }}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors bg-card relative group/col"
                      onClick={() => toggleSort("assigned_by")}
                    >
                      <div className="flex items-center gap-2">
                        PM
                        {sortField === "assigned_by" && (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {renderResizeHandle('pm')}
                    </TableHead>
                  )}
                  {columns.collaborators && (
                    <TableHead style={{ width: columnWidths.collaborators }} className="text-center bg-card relative group/col">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={toggleCollaboratorsColumn}
                              className="h-8 w-8 p-0 hover:bg-muted"
                            >
                              <Users className={`h-3.5 w-3.5 transition-colors ${collaboratorsExpanded ? "text-primary" : "text-muted-foreground"}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{collaboratorsExpanded ? "Hide" : "Show"} Collaborators</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {renderResizeHandle('collaborators')}
                    </TableHead>
                  )}
                  {columns.deadline && (
                    <TableHead
                      style={{ width: columnWidths.deadline }}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors bg-card relative group/col"
                      onClick={() => toggleSort("deadline")}
                    >
                      <div className="flex items-center gap-2">
                        Deadline
                        {sortField === "deadline" && (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {renderResizeHandle('deadline')}
                    </TableHead>
                  )}
                  {columns.submission && (
                    <TableHead
                      style={{ width: columnWidths.submission }}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors bg-card relative group/col"
                      onClick={() => toggleSort("submission")}
                    >
                      <div className="flex items-center gap-2">
                        Submission
                        {sortField === "submission" && (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {renderResizeHandle('submission')}
                    </TableHead>
                  )}
                  {columns.delay && (
                    <TableHead
                      style={{ width: columnWidths.delay }}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors bg-card relative group/col"
                      onClick={() => toggleSort("delay")}
                    >
                      <div className="flex items-center gap-2">
                        Delay
                        {sortField === "delay" && (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {renderResizeHandle('delay')}
                    </TableHead>
                  )}
                  {columns.time && (
                    <TableHead
                      style={{ width: columnWidths.time }}
                      className="bg-card relative group/col"
                    >
                      <div className="flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Time</span>
                      </div>
                      {renderResizeHandle('time')}
                    </TableHead>
                  )}
                  {columns.status && (
                    <TableHead
                      style={{ width: columnWidths.status }}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors bg-card relative group/col"
                      onClick={() => toggleSort("status")}
                    >
                      <div className="flex items-center gap-2">
                        Status
                        {sortField === "status" && (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {renderResizeHandle('status')}
                    </TableHead>
                  )}
                  {columns.urgency && (
                    <TableHead
                      style={{ width: columnWidths.urgency, minWidth: 90 }}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors bg-card relative group/col"
                      onClick={() => toggleSort("urgency")}
                    >
                      <div className="flex items-center gap-2">
                        Urgency
                        {sortField === "urgency" && (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {renderResizeHandle('urgency')}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const delayDays = calculateDelay(task.deadline, task.actual_delivery, task.status);
                  const highlightClass = getTaskHighlightClass(task, delayDays);
                  return (
                    <TableRow
                      key={task.id}
                      className={`cursor-pointer transition-all group ${highlightClass}`}
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
                      {columns.date && (
                        <TableCell>
                          <div className="relative">
                            <div className="status-indicator" style={{ backgroundColor: getStatusColor(task.status).split(' ')[0].replace('bg-[', '').replace(']', '') }} />
                            {new Date(task.date).toLocaleDateString()}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <div className="relative flex items-center gap-2 group/name max-w-[140px]">
                          <span className="truncate" title={task.task_name}>{task.task_name}</span>
                          {task.revision_count > 0 && (
                            <div className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-400 text-[10px] font-semibold">
                              {task.revision_count}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {columns.client && <TableCell><span className="truncate block max-w-[80px]" title={task.clients?.name || "-"}>{task.clients?.name || "-"}</span></TableCell>}
                      {columns.project && <TableCell><span className="truncate block max-w-[70px]" title={task.projects?.name || "-"}>{task.projects?.name || "-"}</span></TableCell>}
                      {columns.taskOwner && userRole !== "team_member" && (
                        <TableCell>
                          <div className="flex items-center gap-1.5 max-w-[100px]">
                            {task.assignee_id === userId ? (
                              <>
                                <Avatar className="h-5 w-5 flex-shrink-0">
                                  <AvatarImage src={task.assignee?.avatar_url || undefined} alt={task.assignee?.full_name} />
                                  <AvatarFallback className="text-[10px]">
                                    {task.assignee?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm" title={task.assignee?.full_name}>{task.assignee?.full_name || "-"}</span>
                              </>
                            ) : (
                              <>
                                <Avatar className="h-5 w-5 flex-shrink-0">
                                  <AvatarImage src={task.assignee?.avatar_url || undefined} alt={task.assignee?.full_name} />
                                  <AvatarFallback className="text-[10px]">
                                    {task.assignee?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm" title={task.assignee?.full_name}>{task.assignee?.full_name || "-"}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {columns.pm && (
                        <TableCell>
                          <div className="flex items-center gap-1.5 max-w-[90px]">
                            <Avatar className="h-5 w-5 flex-shrink-0">
                              <AvatarImage src={task.assigned_by?.avatar_url || undefined} alt={task.assigned_by?.full_name} />
                              <AvatarFallback className="text-[10px]">
                                {task.assigned_by?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-sm" title={task.assigned_by?.full_name}>{task.assigned_by?.full_name || "-"}</span>
                          </div>
                        </TableCell>
                      )}
                      {columns.collaborators && (
                        <TableCell className="p-0 relative">
                          {/* Show task owner icon for TM collaboration tasks */}
                          {userRole === "team_member" && task.assignee_id !== userId && task.collaborators?.some((c: any) => c.user_id === userId) ? (
                            <div className="w-10 flex items-center justify-center py-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="relative">
                                      <Avatar className="h-6 w-6 border-2 border-primary/50">
                                        <AvatarImage src={task.assignee?.avatar_url || undefined} alt={task.assignee?.full_name} />
                                        <AvatarFallback className="text-xs bg-primary/10">
                                          {task.assignee?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary flex items-center justify-center">
                                        <Star className="h-2 w-2 text-primary-foreground" />
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Task Owner: {task.assignee?.full_name || "Unknown"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ) : task.collaborators && task.collaborators.length > 0 ? (
                            <Collapsible
                              open={collaboratorsExpanded}
                              onOpenChange={() => { }}
                            >
                              <div className="flex items-center">
                                {!collaboratorsExpanded ? (
                                  <div className="w-10 flex items-center justify-center py-2">
                                    <div className="flex -space-x-2">
                                      {task.collaborators.slice(0, 2).map((collab: any, idx: number) => (
                                        <TooltipProvider key={idx}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Avatar className="h-6 w-6 border-2 border-background">
                                                <AvatarImage
                                                  src={collab.profiles?.avatar_url || undefined}
                                                  alt={collab.profiles?.full_name}
                                                />
                                                <AvatarFallback className="text-xs">
                                                  {collab.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                                                </AvatarFallback>
                                              </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{collab.profiles?.full_name || "Unknown"}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ))}
                                      {task.collaborators.length > 2 && (
                                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                          <span className="text-[10px] font-medium">+{task.collaborators.length - 2}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <CollapsibleContent className="w-full">
                                    <div className="px-2 py-2 w-full min-w-[200px]">
                                      <div className="flex flex-wrap gap-2">
                                        {task.collaborators.map((collab: any, idx: number) => {
                                          const firstName = collab.profiles?.full_name?.split(" ")[0] || "Unknown";
                                          return (
                                            <TooltipProvider key={idx}>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                                                    <Avatar className="h-5 w-5">
                                                      <AvatarImage
                                                        src={collab.profiles?.avatar_url || undefined}
                                                        alt={collab.profiles?.full_name}
                                                      />
                                                      <AvatarFallback className="text-[10px]">
                                                        {collab.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                                                      </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-medium">
                                                      {firstName}
                                                    </span>
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>{collab.profiles?.full_name || "Unknown"}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                )}
                              </div>
                            </Collapsible>
                          ) : (
                            <div className="w-10 flex items-center justify-center">
                              <span className="text-muted-foreground text-xs">-</span>
                            </div>
                          )}
                        </TableCell>
                      )}
                      {columns.deadline && (
                        <TableCell>
                          {task.deadline ? new Date(task.deadline).toLocaleDateString() : "-"}
                        </TableCell>
                      )}
                      {columns.submission && (
                        <TableCell>
                          {task.actual_delivery ? new Date(task.actual_delivery).toLocaleDateString() : "-"}
                        </TableCell>
                      )}
                      {columns.delay && (
                        <TableCell>
                          {delayDays !== null ? (
                            <span className={delayDays > 0 ? "text-destructive font-medium" : delayDays < 0 ? "text-green-600 font-medium" : ""}>
                              {delayDays > 0 ? `+${delayDays}d` : delayDays < 0 ? `${delayDays}d` : "On time"}
                            </span>
                          ) : "-"}
                        </TableCell>
                      )}
                      {columns.time && (
                        <TableCell>
                          {(() => {
                            const totalSeconds = getTaskTotalTime(task.id);
                            const isActive = isTaskActive(task.id);
                            if (totalSeconds === 0 && !isActive) return <span className="text-muted-foreground">-</span>;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className={`flex items-center justify-center h-7 w-14 rounded-full text-xs font-medium ${isActive
                                      ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                      : "bg-muted text-muted-foreground"
                                      }`}>
                                      {formatTimeTracking(totalSeconds)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{isActive ? "Timer active" : "Time spent on task"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </TableCell>
                      )}
                      {columns.status && (
                        <TableCell onClick={(e) => e.stopPropagation()} className="!bg-transparent">
                          {userRole === "team_member" && !canTeamMemberChangeStatus(task.status) ? (
                            <Badge className={statuses.find(s => s.label === task.status)?.color || "bg-muted"}>
                              {task.status}
                            </Badge>
                          ) : (
                            <BadgeDropdown
                              value={task.status}
                              options={
                                userRole === "team_member"
                                  ? statuses.filter(s => ["Not Started", "In Progress", "In Approval"].includes(s.label))
                                  : statuses
                              }
                              onChange={(value) => handleStatusChange(task.id, value)}
                              disabled={!canEdit(task)}
                            />
                          )}
                        </TableCell>
                      )}
                      {columns.urgency && (
                        <TableCell onClick={(e) => e.stopPropagation()} className="!bg-transparent">
                          {userRole === "team_member" ? (
                            <Badge className={urgencies.find(u => u.label === task.urgency)?.color || "bg-muted"}>
                              {task.urgency}
                            </Badge>
                          ) : (
                            <BadgeDropdown
                              value={task.urgency}
                              options={urgencies}
                              onChange={(value) => handleUrgencyChange(task.id, value)}
                              disabled={!canEdit(task)}
                            />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* White Board View */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {filteredTasks.map((task, index) => {
            const delayDays = calculateDelay(task.deadline, task.actual_delivery, task.status);
            const highlightClass = getTaskHighlightClass(task, delayDays);
            return (
              <div
                key={task.id}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'both'
                }}
                className={`animate-fade-in-up rounded-lg ${highlightClass}`}
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
            );
          })}
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
                  const allowedStatuses = ["Not Started", "In Progress", "In Approval"];
                  if (allowedStatuses.includes(newStatus)) {
                    handleStatusChange(taskId, newStatus);
                  }
                }
              }
              : handleStatusChange
          }
          onUrgencyChange={userRole !== "team_member" ? handleUrgencyChange : () => { }}
          onAppreciationToggle={toggleAppreciation}
          onSubmit={(taskData: any) => {
            setSelectedTaskForSubmit(taskData);
            setSubmitDialogOpen(true);
          }}
          onNotesClick={(taskData: any) => {
            setSelectedTask(taskData);
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
        onDuplicate={(duplicateData) => {
          if (onDuplicate) {
            onDuplicate(duplicateData);
            setDetailDialogOpen(false);
          }
        }}
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
