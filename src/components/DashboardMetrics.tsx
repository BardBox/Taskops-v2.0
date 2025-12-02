import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metrics {
  total: number;
  todo: number;
  doing: number;
  done: number;
  approved: number;
  onHold: number;
  delayed: number;
  awaitingApproval: number;
}

interface DashboardMetricsProps {
  filters?: {
    year: string;
    month: string;
    status: string;
    urgency: string;
    clientId: string;
    teamMemberId: string;
    projectManagerId: string;
    highlightToday: boolean;
    quickFilter: string[];
  };
}

const AnimatedCounter = ({ value, duration = 800 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = displayValue;
    const end = value;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / (end - start)));
    
    if (start === end) return;

    const timer = setInterval(() => {
      setDisplayValue((prev) => {
        const next = prev + increment;
        if ((increment > 0 && next >= end) || (increment < 0 && next <= end)) {
          clearInterval(timer);
          return end;
        }
        return next;
      });
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span className="animate-count-up">{displayValue}</span>;
};

const CircularProgress = ({ 
  percentage, 
  size = 80, 
  strokeWidth = 8,
  color = "hsl(var(--primary))"
}: { 
  percentage: number; 
  size?: number; 
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

export const DashboardMetrics = ({ filters }: DashboardMetricsProps) => {
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    todo: 0,
    doing: 0,
    done: 0,
    approved: 0,
    onHold: 0,
    delayed: 0,
    awaitingApproval: 0,
  });
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [collaboratedCount, setCollaboratedCount] = useState(0);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchMetrics();
    }

    const channel = supabase
      .channel("tasks-metrics")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => fetchMetrics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters, userId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      if (roleData) {
        setUserRole(roleData.role);
      }
    }
  };

  const fetchMetrics = async () => {
    let query = supabase
      .from("tasks")
      .select("status, deadline, actual_delivery, date, urgency, client_id, assignee_id, assigned_by_id, revision_count");

    // Team members only see their own tasks (no other filters applied)
    if (userRole === "team_member" && userId) {
      query = query.eq("assignee_id", userId);
    } else {
      // PM and PO see total statistics based on filters
      if (filters) {
        // Apply quick filters first
        if (filters.quickFilter && filters.quickFilter.length > 0) {
          const quickFilters = filters.quickFilter;
          
          // Handle "my-tasks" filter for PO/PM
          if (quickFilters.includes("my-tasks") && userId) {
            query = query.or(`assignee_id.eq.${userId},assigned_by_id.eq.${userId}`);
          }
          
          // Handle "most-busy" and "least-busy" filters
          if (quickFilters.includes("most-busy") || quickFilters.includes("least-busy")) {
            // Fetch team member with most/least pending tasks
            const { data: teamMembers } = await supabase
              .from("user_roles")
              .select("user_id")
              .eq("role", "team_member");
            
            if (teamMembers && teamMembers.length > 0) {
              const memberIds = teamMembers.map(tm => tm.user_id);
              
              // Count pending tasks for each team member
              const { data: pendingTasks } = await supabase
                .from("tasks")
                .select("assignee_id")
                .in("assignee_id", memberIds)
                .in("status", ["Not Started", "In Progress", "Waiting for Approval", "In Approval"]);
              
              if (pendingTasks) {
                const taskCounts = pendingTasks.reduce((acc, task) => {
                  acc[task.assignee_id] = (acc[task.assignee_id] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                
                const sortedMembers = Object.entries(taskCounts).sort((a, b) => b[1] - a[1]);
                
                if (sortedMembers.length > 0) {
                  if (quickFilters.includes("most-busy")) {
                    query = query.eq("assignee_id", sortedMembers[0][0]);
                  } else if (quickFilters.includes("least-busy")) {
                    query = query.eq("assignee_id", sortedMembers[sortedMembers.length - 1][0]);
                  }
                }
              }
            }
          }
          
          // Handle time-based filters
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (quickFilters.includes("today")) {
            const todayStr = today.toISOString().split('T')[0];
            query = query.or(`deadline.eq.${todayStr},status.in.("Not Started","In Progress","Waiting for Approval")`);
          }
          
          if (quickFilters.includes("this-month")) {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
            query = query.gte("deadline", firstDay).lte("deadline", lastDay);
          }
          
          // Handle additive filters
          if (quickFilters.includes("urgent")) {
            query = query.in("urgency", ["High", "Critical", "Urgent"]);
          }
          
          if (quickFilters.includes("revisions")) {
            query = query.gt("revision_count", 0);
          }
          
          if (quickFilters.includes("pending")) {
            query = query.in("status", ["In Progress", "Doing"]);
          }
        }
        
        // Apply standard filters
        if (filters.year !== "all") {
          const yearStart = `${filters.year}-01-01`;
          const yearEnd = `${filters.year}-12-31`;
          query = query.gte("date", yearStart).lte("date", yearEnd);
        }
        
        if (filters.month !== "all") {
          const year = filters.year !== "all" ? filters.year : new Date().getFullYear();
          const monthStart = `${year}-${filters.month.padStart(2, '0')}-01`;
          const lastDay = new Date(Number(year), Number(filters.month), 0).getDate();
          const monthEnd = `${year}-${filters.month.padStart(2, '0')}-${lastDay}`;
          query = query.gte("date", monthStart).lte("date", monthEnd);
        }
        
        if (filters.status !== "all") {
          query = query.eq("status", filters.status);
        }
        
        if (filters.urgency !== "all") {
          query = query.eq("urgency", filters.urgency);
        }
        
        if (filters.clientId !== "all") {
          query = query.eq("client_id", filters.clientId);
        }
        
        if (filters.teamMemberId !== "all") {
          query = query.eq("assignee_id", filters.teamMemberId);
        }
        
        if (filters.projectManagerId !== "all") {
          query = query.eq("assigned_by_id", filters.projectManagerId);
        }
      }
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error("Error fetching metrics:", error);
      return;
    }

    if (!tasks) return;

    // Fetch collaborated tasks count for team members
    if (userRole === "team_member" && userId) {
      const { data: collabTasks } = await supabase
        .from("task_collaborators")
        .select("task_id")
        .eq("user_id", userId);
      
      setCollaboratedCount(collabTasks?.length || 0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const delayed = tasks.filter((task) => {
      if (task.status === "Approved" || task.status === "Cancelled") return false;
      if (!task.deadline) return false;
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today;
    }).length;

    const awaitingApproval = tasks.filter((t) => t.status === "In Approval" || t.status === "Waiting for Approval").length;

    setMetrics({
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "Not Started").length,
      doing: tasks.filter((t) => t.status === "In Progress" || t.status === "In Approval" || t.status === "Waiting for Approval").length,
      done: tasks.filter((t) => t.status === "Approved").length,
      approved: tasks.filter((t) => t.status === "Approved").length,
      onHold: tasks.filter((t) => t.status === "On Hold").length,
      delayed,
      awaitingApproval,
    });
  };

  const completionRate = metrics.total > 0 ? (metrics.approved / metrics.total) * 100 : 0;
  const inProgressRate = metrics.total > 0 ? (metrics.doing / metrics.total) * 100 : 0;

  return (
    <div className="grid gap-3 md:gap-6 grid-cols-2 lg:grid-cols-4">
      <Card className={cn(
        "hover-lift hover-glow overflow-hidden relative",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
          <CardTitle className="text-xs md:text-sm font-medium">Total Tasks</CardTitle>
          <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">
            <AnimatedCounter value={metrics.total} />
          </div>
          {collaboratedCount > 0 && (
            <p className="text-[10px] md:text-xs text-muted-foreground mb-1 md:mb-2">
              {collaboratedCount} as collaborator
            </p>
          )}
          <div className="flex items-center gap-2 md:gap-3">
            <CircularProgress 
              percentage={completionRate} 
              size={48} 
              strokeWidth={5}
              color="hsl(var(--primary))"
            />
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {metrics.approved} approved
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        "hover-lift hover-glow overflow-hidden relative",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
          <CardTitle className="text-xs md:text-sm font-medium">In Progress</CardTitle>
          <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-500 transition-transform duration-300 group-hover:scale-110" />
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-blue-600">
            <AnimatedCounter value={metrics.doing} />
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <CircularProgress 
              percentage={inProgressRate} 
              size={48} 
              strokeWidth={5}
              color="hsl(210 100% 50%)"
            />
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {metrics.todo} to start
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        "hover-lift hover-glow overflow-hidden relative",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-green-500/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
          <CardTitle className="text-xs md:text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500 transition-transform duration-300 group-hover:scale-110" />
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-green-600">
            <AnimatedCounter value={metrics.done} />
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative">
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 md:h-8 md:w-8 text-green-600" />
              </div>
            </div>
            <div className="flex flex-col">
              <p className="text-xs md:text-sm font-semibold text-orange-600">
                <AnimatedCounter value={metrics.awaitingApproval} />
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Awaiting
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        "hover-lift hover-glow overflow-hidden relative border-destructive/20",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-destructive/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
          <CardTitle className="text-xs md:text-sm font-medium">Delayed</CardTitle>
          <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-destructive animate-pulse-subtle" />
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="text-2xl md:text-3xl font-bold text-destructive mb-1 md:mb-2">
            <AnimatedCounter value={metrics.delayed} />
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative">
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center animate-pulse-subtle">
                <AlertCircle className="h-5 w-5 md:h-8 md:w-8 text-destructive" />
              </div>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Past deadline
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
