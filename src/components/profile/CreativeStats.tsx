import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Flame } from "lucide-react";

interface CreativeStatsProps {
  userId: string;
}

export function CreativeStats({ userId }: CreativeStatsProps) {
  const [stats, setStats] = useState({
    completedTasks: 0,
    currentStreak: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const fetchStats = async () => {
    // Get completed tasks count
    const { count: completedCount } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("assignee_id", userId)
      .eq("status", "Approved");

    // Get tasks completed this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthCount } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("assignee_id", userId)
      .eq("status", "Approved")
      .gte("actual_delivery", startOfMonth.toISOString());

    setStats({
      completedTasks: completedCount || 0,
      currentStreak: 0, // TODO: Implement streak calculation
      thisMonth: monthCount || 0,
    });
  };

  const statItems = [
    {
      icon: Trophy,
      label: "Completed Tasks",
      value: stats.completedTasks,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      icon: Flame,
      label: "Current Streak",
      value: `${stats.currentStreak} days`,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      icon: Target,
      label: "This Month",
      value: stats.thisMonth,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Creative Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {statItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg ${item.bg} border border-border/50`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <span className="text-xl font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
