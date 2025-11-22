import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Activity, TrendingUp, Users, Award, Target, Zap, Clock, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface OrganizationStats {
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  delayedTasks: number;
  activeTasks: number;
  totalTeamMembers: number;
  totalClients: number;
  totalPMs: number;
  healthScore: number;
  performanceIndex: number;
  clientSatisfactionScore: number;
  pmEfficiencyScore: number;
}

const Overview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrganizationStats>({
    totalTasks: 0,
    completedTasks: 0,
    onTimeTasks: 0,
    delayedTasks: 0,
    activeTasks: 0,
    totalTeamMembers: 0,
    totalClients: 0,
    totalPMs: 0,
    healthScore: 0,
    performanceIndex: 0,
    clientSatisfactionScore: 0,
    pmEfficiencyScore: 0,
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [realtimeStats, setRealtimeStats] = useState({
    tasksToday: 0,
    tasksDueToday: 0,
    capacityUtilization: 0,
    qualityStarsThisMonth: 0,
  });

  useEffect(() => {
    fetchOrganizationStats();
  }, []);

  const fetchOrganizationStats = async () => {
    try {
      // Fetch all tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!tasks_assignee_id_fkey(full_name)');

      if (tasksError) throw tasksError;

      // Fetch team members count
      const { data: teamMembers, error: tmError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'team_member');

      if (tmError) throw tmError;

      // Fetch PMs count
      const { data: pms, error: pmError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'project_manager');

      if (pmError) throw pmError;

      // Fetch clients count
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id');

      if (clientsError) throw clientsError;

      // Fetch quality stars
      const { data: stars, error: starsError } = await supabase
        .from('task_appreciations')
        .select('id, created_at');

      if (starsError) throw starsError;

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const completedTasks = tasks?.filter(t => t.status === 'Approved').length || 0;
      const onTimeTasks = tasks?.filter(t => 
        t.status === 'Approved' && 
        t.actual_delivery && 
        t.deadline && 
        new Date(t.actual_delivery) <= new Date(t.deadline)
      ).length || 0;
      const delayedTasks = tasks?.filter(t => 
        t.status === 'Approved' && 
        t.actual_delivery && 
        t.deadline && 
        new Date(t.actual_delivery) > new Date(t.deadline)
      ).length || 0;
      const activeTasks = tasks?.filter(t => 
        t.status !== 'Approved' && t.status !== 'Cancelled'
      ).length || 0;

      // Calculate scores
      const completionRate = tasks && tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
      const onTimeRate = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;
      const healthScore = (completionRate * 0.4 + onTimeRate * 0.6);
      const performanceIndex = completionRate;
      const clientSatisfactionScore = onTimeRate;
      const pmEfficiencyScore = completionRate;

      // Calculate realtime stats
      const tasksToday = tasks?.filter(t => t.created_at.split('T')[0] === today).length || 0;
      const tasksDueToday = tasks?.filter(t => t.deadline === today).length || 0;
      const qualityStarsThisMonth = stars?.filter(s => 
        new Date(s.created_at) >= new Date(firstDayOfMonth)
      ).length || 0;

      setStats({
        totalTasks: tasks?.length || 0,
        completedTasks,
        onTimeTasks,
        delayedTasks,
        activeTasks,
        totalTeamMembers: teamMembers?.length || 0,
        totalClients: clients?.length || 0,
        totalPMs: pms?.length || 0,
        healthScore,
        performanceIndex,
        clientSatisfactionScore,
        pmEfficiencyScore,
      });

      setRealtimeStats({
        tasksToday,
        tasksDueToday,
        capacityUtilization: activeTasks && teamMembers ? (activeTasks / (teamMembers.length * 5)) * 100 : 0,
        qualityStarsThisMonth,
      });

      // Generate 6-month trend data
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const trendData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

        const monthTasks = tasks?.filter(t => 
          t.created_at >= monthStart && t.created_at <= monthEnd
        );
        const monthCompleted = monthTasks?.filter(t => t.status === 'Approved').length || 0;

        trendData.push({
          month: monthNames[date.getMonth()],
          tasks: monthTasks?.length || 0,
          completed: monthCompleted,
          onTime: monthTasks?.filter(t => 
            t.status === 'Approved' && 
            t.actual_delivery && 
            t.deadline && 
            new Date(t.actual_delivery) <= new Date(t.deadline)
          ).length || 0,
        });
      }

      setTrendData(trendData);
    } catch (error) {
      console.error('Error fetching organization stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default" className="bg-green-600">Excellent</Badge>;
    if (score >= 60) return <Badge variant="default" className="bg-yellow-600">Good</Badge>;
    return <Badge variant="default" className="bg-red-600">Needs Attention</Badge>;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Breadcrumbs />
          <div className="mt-4">
            <h1 className="text-3xl font-bold tracking-tight">Bardbox Command Center</h1>
            <p className="text-muted-foreground">Real-time organizational performance overview</p>
          </div>
        </div>

        {/* Key Metrics Cards (Clickable) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-primary"
            onClick={() => navigate('/analytics')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Overall Health Score</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.healthScore.toFixed(0)}%</div>
              <Progress value={stats.healthScore} className="mb-2" />
              <div className="flex items-center justify-between">
                {getScoreBadge(stats.healthScore)}
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Click for full breakdown
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-blue-500"
            onClick={() => navigate('/analytics?tab=team')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.performanceIndex.toFixed(0)}%</div>
              <Progress value={stats.performanceIndex} className="mb-2" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stats.totalTeamMembers} Members</span>
                <Badge variant="outline">{stats.completedTasks} Tasks</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                View leaderboard & analysis
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-green-500"
            onClick={() => navigate('/analytics?tab=clients')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Client Satisfaction</CardTitle>
                <Award className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.clientSatisfactionScore.toFixed(0)}%</div>
              <Progress value={stats.clientSatisfactionScore} className="mb-2" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stats.totalClients} Clients</span>
                {getScoreBadge(stats.clientSatisfactionScore)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                View client performance matrix
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-purple-500"
            onClick={() => navigate('/analytics?tab=pm')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">PM Efficiency</CardTitle>
                <Target className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.pmEfficiencyScore.toFixed(0)}%</div>
              <Progress value={stats.pmEfficiencyScore} className="mb-2" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stats.totalPMs} PMs</span>
                <Badge variant="outline">{stats.totalTasks} Total</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                View PM dashboards
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Real-Time Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Live Stats
            </CardTitle>
            <CardDescription>Real-time metrics right now</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{realtimeStats.tasksToday}</p>
                  <p className="text-sm text-muted-foreground">Tasks Created Today</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{realtimeStats.tasksDueToday}</p>
                  <p className="text-sm text-muted-foreground">Due Today</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{realtimeStats.capacityUtilization.toFixed(0)}%</p>
                  <p className="text-sm text-muted-foreground">Capacity Utilization</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Award className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{realtimeStats.qualityStarsThisMonth}</p>
                  <p className="text-sm text-muted-foreground">Quality Stars (Month)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6-Month Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>6-Month Performance Trend</CardTitle>
            <CardDescription>Organization-wide completion rates and quality metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={{
                tasks: { label: "Total Tasks", color: "hsl(var(--primary))" },
                completed: { label: "Completed", color: "hsl(var(--chart-2))" },
                onTime: { label: "On-Time", color: "hsl(var(--chart-3))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="tasks" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                  <Line type="monotone" dataKey="onTime" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completion Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Tasks</span>
                  <span className="font-bold">{stats.totalTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Completed</span>
                  <span className="font-bold text-green-600">{stats.completedTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Active</span>
                  <span className="font-bold text-blue-600">{stats.activeTasks}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Delivery Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">On-Time</span>
                  <span className="font-bold text-green-600">{stats.onTimeTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Delayed</span>
                  <span className="font-bold text-red-600">{stats.delayedTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Success Rate</span>
                  <span className="font-bold">
                    {stats.completedTasks > 0 
                      ? ((stats.onTimeTasks / stats.completedTasks) * 100).toFixed(0) 
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Team Members</span>
                  <span className="font-bold">{stats.totalTeamMembers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Project Managers</span>
                  <span className="font-bold">{stats.totalPMs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Active Clients</span>
                  <span className="font-bold">{stats.totalClients}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Overview;