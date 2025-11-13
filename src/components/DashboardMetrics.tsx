import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";

interface Metrics {
  total: number;
  todo: number;
  doing: number;
  done: number;
  approved: number;
  onHold: number;
  delayed: number;
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
  };
}

export const DashboardMetrics = ({ filters }: DashboardMetricsProps) => {
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    todo: 0,
    doing: 0,
    done: 0,
    approved: 0,
    onHold: 0,
    delayed: 0,
  });

  useEffect(() => {
    fetchMetrics();

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
  }, [filters]);

  const fetchMetrics = async () => {
    let query = supabase
      .from("tasks")
      .select("status, deadline, actual_delivery, date, urgency, client_id, assignee_id, assigned_by_id");

    // Apply filters
    if (filters) {
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

    const { data: tasks, error } = await query;

    if (error) {
      console.error("Error fetching metrics:", error);
      return;
    }

    if (!tasks) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const delayed = tasks.filter((task) => {
      if (task.status === "Approved" || task.status === "Cancelled") return false;
      if (!task.deadline) return false;
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today;
    }).length;

    setMetrics({
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "To Do").length,
      doing: tasks.filter((t) => t.status === "Doing").length,
      done: tasks.filter((t) => t.status === "Done").length,
      approved: tasks.filter((t) => t.status === "Approved").length,
      onHold: tasks.filter((t) => t.status === "On Hold").length,
      delayed,
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.approved} approved
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.doing}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.todo} to start
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.done}</div>
          <p className="text-xs text-muted-foreground">
            Awaiting approval
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Delayed</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{metrics.delayed}</div>
          <p className="text-xs text-muted-foreground">
            Past deadline
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
