import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, TrendingUp, TrendingDown, Award, Calendar, Download } from "lucide-react";
import { exportToPDF } from "@/utils/pdfExport";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format } from "date-fns";

interface Task {
  id: string;
  task_name: string;
  date: string;
  deadline: string;
  actual_delivery: string;
  status: string;
  urgency: string;
  delay_days: number;
  client_name: string;
}

interface IndividualPerformanceProps {
  individualId: string;
  individualName: string;
  onBack: () => void;
  teamAverage: {
    weightedScore: number;
    completionRate: number;
    onTimeRate: number;
    avgDelayDays: number;
  };
}

export const IndividualPerformance = ({ 
  individualId, 
  individualName, 
  onBack,
  teamAverage 
}: IndividualPerformanceProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [qualityStars, setQualityStars] = useState(0);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalTasks: 0,
    completedTasks: 0,
    onTimeTasks: 0,
    delayedTasks: 0,
    avgDelayDays: 0,
    weightedScore: 0,
    completionRate: 0,
    onTimeRate: 0,
  });

  useEffect(() => {
    fetchIndividualData();
  }, [individualId]);

  const fetchIndividualData = async () => {
    setLoading(true);

    // Fetch tasks
    const { data: tasksData } = await supabase
      .from("taskops_filtered_tasks" as any)
      .select("*")
      .eq("assignee_id", individualId)
      .order("date", { ascending: false });

    if (tasksData) {
      setTasks(tasksData as any);
      calculateMetrics(tasksData);
      calculateMonthlyTrends(tasksData);
    }

    // Fetch quality stars
    const { data: appreciations } = await supabase
      .from("task_appreciations" as any)
      .select("id")
      .in("task_id", tasksData?.map((t: any) => t.id) || []);

    setQualityStars(appreciations?.length || 0);
    setLoading(false);
  };

  const calculateMetrics = (tasksData: any[]) => {
    const urgencyWeights = { Low: 1, Mid: 2, High: 3 };
    
    const totalTasks = tasksData.length;
    const completedTasks = tasksData.filter(
      (t) => t.status === "Approved" || t.status === "Done"
    ).length;
    const onTimeTasks = tasksData.filter(
      (t) => (t.status === "Approved" || t.status === "Done") && (t.delay_days || 0) <= 0
    ).length;
    const delayedTasks = tasksData.filter((t) => (t.delay_days || 0) > 0).length;
    const avgDelayDays = tasksData.reduce((sum, t) => sum + (t.delay_days || 0), 0) / totalTasks;

    // Calculate weighted score
    let totalWeight = 0;
    let earnedWeight = 0;
    tasksData.forEach((task) => {
      const weight = urgencyWeights[task.urgency as keyof typeof urgencyWeights] || 1;
      totalWeight += weight;
      
      if (task.status === "Approved" || task.status === "Done") {
        const delayPenalty = task.delay_days > 0 ? Math.max(0, 1 - (task.delay_days * 0.1)) : 1;
        earnedWeight += weight * delayPenalty;
      }
    });
    const weightedScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const onTimeRate = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;

    setPerformanceMetrics({
      totalTasks,
      completedTasks,
      onTimeTasks,
      delayedTasks,
      avgDelayDays: Math.max(0, avgDelayDays),
      weightedScore,
      completionRate,
      onTimeRate,
    });
  };

  const calculateMonthlyTrends = (tasksData: any[]) => {
    const monthlyData = new Map<string, any>();

    tasksData.forEach((task) => {
      const monthKey = format(new Date(task.date), "MMM yyyy");
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          total: 0,
          completed: 0,
          onTime: 0,
          delayed: 0,
        });
      }

      const data = monthlyData.get(monthKey);
      data.total += 1;
      
      if (task.status === "Approved" || task.status === "Done") {
        data.completed += 1;
        if ((task.delay_days || 0) <= 0) {
          data.onTime += 1;
        } else {
          data.delayed += 1;
        }
      }
    });

    const trends = Array.from(monthlyData.values())
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months

    setMonthlyTrends(trends);
  };

  const getComparisonIndicator = (value: number, average: number, lowerIsBetter = false) => {
    const diff = value - average;
    const isPositive = lowerIsBetter ? diff < 0 : diff > 0;
    
    return {
      icon: isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
      color: isPositive ? "text-notification-success" : "text-notification-error",
      text: `${Math.abs(diff).toFixed(1)}${lowerIsBetter ? 'd' : '%'} ${isPositive ? 'better' : 'below'} team avg`,
    };
  };

  const handleExport = async () => {
    toast.info("Generating PDF...");
    await exportToPDF(
      "individual-performance",
      `${individualName.replace(/\s+/g, '-')}-performance-${new Date().toISOString().split('T')[0]}.pdf`,
      `${individualName} - Performance Report`
    );
    toast.success("PDF exported successfully!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const chartConfig = {
    completed: { label: "Completed", color: "hsl(var(--primary))" },
    onTime: { label: "On Time", color: "hsl(var(--chart-2))" },
    delayed: { label: "Delayed", color: "hsl(var(--destructive))" },
  };

  return (
    <div className="space-y-6" id="individual-performance">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{individualName}</h2>
            <p className="text-muted-foreground">Individual Performance Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-star text-star" />
            <span className="text-2xl font-bold">{qualityStars}</span>
            <span className="text-sm text-muted-foreground">Quality Stars</span>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Comparison */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.weightedScore.toFixed(1)}%</div>
            <Progress value={performanceMetrics.weightedScore} className="mt-2 h-2" />
            <div className={`flex items-center gap-1 mt-2 text-xs ${getComparisonIndicator(performanceMetrics.weightedScore, teamAverage.weightedScore).color}`}>
              {getComparisonIndicator(performanceMetrics.weightedScore, teamAverage.weightedScore).icon}
              <span>{getComparisonIndicator(performanceMetrics.weightedScore, teamAverage.weightedScore).text}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {performanceMetrics.completedTasks} of {performanceMetrics.totalTasks} tasks
            </p>
            <div className={`flex items-center gap-1 mt-2 text-xs ${getComparisonIndicator(performanceMetrics.completionRate, teamAverage.completionRate).color}`}>
              {getComparisonIndicator(performanceMetrics.completionRate, teamAverage.completionRate).icon}
              <span>{getComparisonIndicator(performanceMetrics.completionRate, teamAverage.completionRate).text}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-notification-success">{performanceMetrics.onTimeRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {performanceMetrics.onTimeTasks} on-time deliveries
            </p>
            <div className={`flex items-center gap-1 mt-2 text-xs ${getComparisonIndicator(performanceMetrics.onTimeRate, teamAverage.onTimeRate).color}`}>
              {getComparisonIndicator(performanceMetrics.onTimeRate, teamAverage.onTimeRate).icon}
              <span>{getComparisonIndicator(performanceMetrics.onTimeRate, teamAverage.onTimeRate).text}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Delay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-notification-error">{performanceMetrics.avgDelayDays.toFixed(1)}d</div>
            <p className="text-xs text-muted-foreground mt-1">
              {performanceMetrics.delayedTasks} delayed tasks
            </p>
            <div className={`flex items-center gap-1 mt-2 text-xs ${getComparisonIndicator(performanceMetrics.avgDelayDays, teamAverage.avgDelayDays, true).color}`}>
              {getComparisonIndicator(performanceMetrics.avgDelayDays, teamAverage.avgDelayDays, true).icon}
              <span>{getComparisonIndicator(performanceMetrics.avgDelayDays, teamAverage.avgDelayDays, true).text}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends (Last 6 Months)</CardTitle>
          <CardDescription>Task completion and delivery patterns over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Completed"
                />
                <Line 
                  type="monotone" 
                  dataKey="onTime" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  name="On Time"
                />
                <Line 
                  type="monotone" 
                  dataKey="delayed" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Delayed"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Monthly Task Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Task Distribution</CardTitle>
          <CardDescription>Breakdown of task volumes by month</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" />
                <Bar dataKey="delayed" fill="hsl(var(--destructive))" name="Delayed" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Task History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Task History</CardTitle>
          <CardDescription>Last 10 tasks assigned to {individualName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.slice(0, 10).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{task.task_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.date), "MMM dd, yyyy")}
                    </span>
                    <span>{task.client_name || "No client"}</span>
                    <Badge variant="outline" className={
                      task.urgency === "High" ? "border-urgency-high text-urgency-high" :
                      task.urgency === "Mid" ? "border-urgency-medium text-urgency-medium" :
                      "border-urgency-low text-urgency-low"
                    }>
                      {task.urgency}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={
                    task.status === "Approved" ? "bg-status-approved text-status-approved-foreground" :
                    task.status === "Done" ? "bg-status-done text-status-done-foreground" :
                    "bg-status-todo text-status-todo-foreground"
                  }>
                    {task.status}
                  </Badge>
                  {task.delay_days > 0 && (
                    <Badge variant="destructive">
                      +{task.delay_days}d delay
                    </Badge>
                  )}
                  {task.delay_days <= 0 && (task.status === "Approved" || task.status === "Done") && (
                    <Badge className="bg-status-approved text-status-approved-foreground">
                      <Award className="h-3 w-3 mr-1" />
                      On Time
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
