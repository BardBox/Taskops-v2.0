import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, ListTodo, AlertCircle, Calendar } from "lucide-react";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClients: 0,
    totalTasks: 0,
    delayedTasks: 0,
    tasksDueToday: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get total clients
      const { count: clientCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      // Get total tasks
      const { count: taskCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true });

      // Get delayed tasks (using view)
      const { count: delayedCount } = await supabase
        .from("taskops_filtered_tasks" as any)
        .select("*", { count: "exact", head: true })
        .gt("delay_days", 0);

      // Get tasks due today
      const today = new Date().toISOString().split("T")[0];
      const { count: dueTodayCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("deadline", today);

      setStats({
        totalUsers: userCount || 0,
        totalClients: clientCount || 0,
        totalTasks: taskCount || 0,
        delayedTasks: delayedCount || 0,
        tasksDueToday: dueTodayCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Total Clients",
      value: stats.totalClients,
      icon: Building2,
      color: "text-green-600",
    },
    {
      title: "Total Tasks",
      value: stats.totalTasks,
      icon: ListTodo,
      color: "text-purple-600",
    },
    {
      title: "Tasks Delayed",
      value: stats.delayedTasks,
      icon: AlertCircle,
      color: "text-red-600",
    },
    {
      title: "Tasks Due Today",
      value: stats.tasksDueToday,
      icon: Calendar,
      color: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Overview</h2>
        <p className="text-muted-foreground">System statistics and metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
