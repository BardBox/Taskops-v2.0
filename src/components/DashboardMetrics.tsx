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

export const DashboardMetrics = () => {
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
  }, []);

  const fetchMetrics = async () => {
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("status, deadline, actual_delivery");

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
