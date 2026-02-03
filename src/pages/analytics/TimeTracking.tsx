import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  Clock, Timer, Users, Briefcase, TrendingUp, Activity, Coffee,
  Zap, Target, Calendar, BarChart2, PieChart as PieChartIcon,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatTimeTrackingFull } from "@/hooks/useTaskTimeTracking";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTimeReports } from "@/hooks/useTimeReports";
import { useTeamAnalytics } from "@/hooks/useTeamAnalytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Components
import { StatsCard } from "@/components/analytics/StatsCard";
import { LiveActivityFeed } from "@/components/analytics/LiveActivityFeed";
import { TeamStatusGrid } from "@/components/analytics/TeamStatusGrid";
import { EfficiencyGauge } from "@/components/analytics/EfficiencyGauge";
import { TimeHeatmap } from "@/components/analytics/TimeHeatmap";
import { InsightCards } from "@/components/analytics/InsightCards";
import { WeekComparisonChart } from "@/components/analytics/WeekComparisonChart";
import { useTrendAnalytics } from "@/hooks/useTrendAnalytics";
import { DailyTimeline } from "@/components/analytics/DailyTimeline";
import { BurndownChart } from "@/components/analytics/BurndownChart";
import { useIndividualAnalytics } from "@/hooks/useIndividualAnalytics";
import { ExportButton } from "@/components/analytics/ExportButton";
import { ClientProfitability } from "@/components/analytics/ClientProfitability";
import { AnomalyDetection } from "@/components/analytics/AnomalyDetection";
import { CapacityPlanning } from "@/components/analytics/CapacityPlanning";

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

// ============================================================================
// REPORTS VIEW (Enhanced)
// ============================================================================

const ReportsView = ({ dateFrom, dateTo }: { dateFrom?: Date, dateTo?: Date }) => {
  const { reportData, summary, loading } = useTimeReports(dateFrom, dateTo);

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const chartData = reportData.slice(0, 10).map(task => ({
    name: task.taskName.length > 15 ? task.taskName.substring(0, 15) + '...' : task.taskName,
    estimated: Math.round(task.estimatedMinutes / 60 * 10) / 10,
    actual: Math.round(task.actualMinutes / 60 * 10) / 10,
  }));

  // Generate client profitability data
  const clientMap = new Map<string, { name: string; estimated: number; actual: number }>();
  reportData.forEach(task => {
    const existing = clientMap.get(task.clientName) || { name: task.clientName, estimated: 0, actual: 0 };
    existing.estimated += task.estimatedMinutes / 60;
    existing.actual += task.actualMinutes / 60;
    clientMap.set(task.clientName, existing);
  });
  const clientData = Array.from(clientMap.values()).map(c => ({
    clientId: c.name,
    clientName: c.name,
    estimatedHours: c.estimated,
    actualHours: c.actual,
  }));

  // Export data getter
  const getExportData = () => ({
    headers: ['Task', 'Client', 'Assignee', 'Estimated (h)', 'Actual (h)', 'Variance (%)'],
    rows: reportData.map(task => {
      const variance = task.estimatedMinutes > 0
        ? Math.round(((task.actualMinutes - task.estimatedMinutes) / task.estimatedMinutes) * 100)
        : 0;
      return [
        task.taskName,
        task.clientName,
        task.assigneeName,
        Math.round(task.estimatedMinutes / 60 * 10) / 10,
        Math.round(task.actualMinutes / 60 * 10) / 10,
        variance,
      ];
    }),
    filename: `project-reports-${new Date().toISOString().split('T')[0]}`,
  });

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Budget Analysis</h3>
          <p className="text-sm text-muted-foreground">Compare estimated vs actual hours</p>
        </div>
        <ExportButton getData={getExportData} />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Budgeted Hours"
          value={`${(summary.totalEstimatedMinutes / 60).toFixed(1)}h`}
          subtitle="Total estimated"
          icon={Target}
          variant="primary"
        />
        <StatsCard
          title="Actual Hours"
          value={`${(summary.totalActualMinutes / 60).toFixed(1)}h`}
          subtitle="Total tracked"
          icon={Clock}
          variant={summary.totalActualMinutes > summary.totalEstimatedMinutes ? 'danger' : 'success'}
        />
        <StatsCard
          title="Over Budget"
          value={summary.overBudgetTaskCount}
          subtitle="Tasks exceeding estimate"
          icon={ArrowUpRight}
          variant="danger"
        />
        <StatsCard
          title="Under Budget"
          value={summary.underBudgetTaskCount}
          subtitle="Tasks within estimate"
          icon={ArrowDownRight}
          variant="success"
        />
      </div>

      {/* Budget vs Actual Chart */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            Budget vs Actual Hours
          </CardTitle>
          <CardDescription>Top tasks by variance</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No task data available for this period</p>
              </div>
            </div>
          ) : (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="estimated" name="Estimated (h)" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual (h)" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Details Table */}
      {reportData.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Task Budget Analysis</CardTitle>
            <CardDescription>Detailed breakdown of estimated vs actual time</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead className="text-right">Estimated</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.slice(0, 15).map((task) => {
                  const variance = task.actualMinutes - task.estimatedMinutes;
                  const variancePercent = task.estimatedMinutes > 0
                    ? Math.round((variance / task.estimatedMinutes) * 100)
                    : 0;

                  return (
                    <TableRow key={task.taskId}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {task.taskName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{task.clientName}</TableCell>
                      <TableCell className="text-muted-foreground">{task.assigneeName}</TableCell>
                      <TableCell className="text-right">{Math.round(task.estimatedMinutes / 60 * 10) / 10}h</TableCell>
                      <TableCell className="text-right">{Math.round(task.actualMinutes / 60 * 10) / 10}h</TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        variance > 0 ? "text-red-500" : "text-emerald-500"
                      )}>
                        {variance > 0 ? '+' : ''}{variancePercent}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Project Burndown Chart */}
      {reportData.length > 0 && (() => {
        // Generate burndown data
        const totalBudget = Math.round(summary.totalEstimatedMinutes / 60);
        const totalActual = Math.round(summary.totalActualMinutes / 60);

        // Create simulated burndown data points
        const burndownData = [
          { date: 'Start', planned: totalBudget, actual: totalBudget },
          { date: 'Week 1', planned: Math.round(totalBudget * 0.75), actual: Math.round(totalBudget - totalActual * 0.2) },
          { date: 'Week 2', planned: Math.round(totalBudget * 0.5), actual: Math.round(totalBudget - totalActual * 0.45) },
          { date: 'Week 3', planned: Math.round(totalBudget * 0.25), actual: Math.round(totalBudget - totalActual * 0.7) },
          { date: 'Current', planned: 0, actual: Math.max(0, totalBudget - totalActual) },
        ];

        return (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Project Burndown
              </CardTitle>
              <CardDescription>Hours remaining vs planned progress</CardDescription>
            </CardHeader>
            <CardContent>
              <BurndownChart data={burndownData} totalBudget={totalBudget} />
            </CardContent>
          </Card>
        );
      })()}

      {/* Client Profitability */}
      {clientData.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Client Profitability
            </CardTitle>
            <CardDescription>Budget vs actual hours by client</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientProfitability data={clientData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TimeTracking = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<string>('all');

  const {
    loading,
    teamStats,
    dailyStats,
    heatmapData,
    liveActivity,
    summary,
    refetch
  } = useTeamAnalytics(dateFrom, dateTo);

  const { loading: trendsLoading, data: trendsData } = useTrendAnalytics();

  // State for individual tab
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { loading: individualLoading, data: individualData } = useIndividualAnalytics(
    selectedUser !== 'all' ? selectedUser : null,
    selectedDate
  );

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </MainLayout>
    );
  }

  // Prepare data for charts
  const dailyChartData = dailyStats.slice(-14).map(d => ({
    date: d.date.split('-').slice(1).join('/'),
    hours: Math.round(d.totalWorkSeconds / 3600 * 10) / 10,
    breaks: Math.round(d.totalBreakSeconds / 60),
    users: d.activeUsers,
  }));

  const userPieData = teamStats.slice(0, 6).map(u => ({
    name: u.userName.split(' ')[0],
    value: Math.round(u.totalWorkSeconds / 3600 * 10) / 10,
  }));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Breadcrumbs />
          <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Time Tracking Analytics
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Comprehensive insights into team productivity and time allocation
              </p>
            </div>
            <TimeRangeFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
            <TabsTrigger value="overview" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Live </span>Overview
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Team<span className="hidden sm:inline"> Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="individual" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Individual
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <BarChart2 className="h-4 w-4" />
              Project Reports
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
          </TabsList>

          {/* ================================================================ */}
          {/* TAB: LIVE OVERVIEW */}
          {/* ================================================================ */}
          <TabsContent value="overview" className="space-y-6">
            {/* Hero Stats Row */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <StatsCard
                title="Active Now"
                value={summary.activeUsersNow}
                subtitle="Team members working"
                icon={Activity}
                variant="success"
              />
              <StatsCard
                title="On Break"
                value={summary.usersOnBreakNow}
                subtitle="Taking a break"
                icon={Coffee}
                variant="warning"
              />
              <StatsCard
                title="Team Hours Today"
                value={`${summary.totalTeamHoursToday}h`}
                subtitle={`${summary.totalTeamBreakToday}m break`}
                icon={Clock}
                variant="primary"
              />
              <StatsCard
                title="Tasks Worked"
                value={summary.totalTasksWorkedToday}
                subtitle="Unique tasks today"
                icon={Briefcase}
                variant="default"
              />
              <StatsCard
                title="Avg Efficiency"
                value={`${summary.avgEfficiencyScore}%`}
                subtitle="Team average"
                icon={Zap}
                variant={summary.avgEfficiencyScore >= 70 ? 'success' : summary.avgEfficiencyScore >= 50 ? 'warning' : 'danger'}
              />
              <StatsCard
                title="Active Timers"
                value={liveActivity.filter(a => a.status === 'working').length}
                subtitle="Running now"
                icon={Timer}
                variant="success"
              />
            </div>

            {/* Live Activity + Team Status */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    Live Activity
                    <Badge variant="outline" className="ml-2 animate-pulse">
                      LIVE
                    </Badge>
                  </CardTitle>
                  <CardDescription>Real-time team activity feed</CardDescription>
                </CardHeader>
                <CardContent>
                  <LiveActivityFeed activities={liveActivity} />
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    Team Status
                  </CardTitle>
                  <CardDescription>Current status of all team members</CardDescription>
                </CardHeader>
                <CardContent>
                  <TeamStatusGrid members={teamStats} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB: TEAM ANALYTICS */}
          {/* ================================================================ */}
          <TabsContent value="team" className="space-y-6">
            {/* Activity Heatmap */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Activity Heatmap
                </CardTitle>
                <CardDescription>Work distribution by day and hour</CardDescription>
              </CardHeader>
              <CardContent>
                <TimeHeatmap data={heatmapData} />
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Daily Trend */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Daily Hours Trend
                  </CardTitle>
                  <CardDescription>Team hours over the last 14 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyChartData}>
                        <defs>
                          <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="hours"
                          stroke="hsl(var(--chart-1))"
                          fillOpacity={1}
                          fill="url(#hoursGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Team Distribution Pie */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    Time by Team Member
                  </CardTitle>
                  <CardDescription>Hours distribution across team</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={userPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}h`}
                        >
                          {userPieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Leaderboard */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Team Leaderboard
                </CardTitle>
                <CardDescription>Ranked by total hours and efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Team Member</TableHead>
                      <TableHead className="text-right">Work Hours</TableHead>
                      <TableHead className="text-right">Break Time</TableHead>
                      <TableHead className="text-right">Tasks</TableHead>
                      <TableHead className="text-right">Efficiency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamStats.slice(0, 10).map((user, index) => (
                      <TableRow key={user.userId} className="group">
                        <TableCell className="font-bold text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 ring-2 ring-offset-2 ring-offset-background ring-transparent group-hover:ring-primary/30 transition-all">
                              <AvatarImage src={user.avatarUrl || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                {user.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium">{user.userName}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "ml-2 text-[10px]",
                                  user.currentStatus === 'working' && "border-emerald-500/50 text-emerald-600",
                                  user.currentStatus === 'break' && "border-amber-500/50 text-amber-600",
                                  user.currentStatus === 'offline' && "border-slate-500/50 text-slate-500"
                                )}
                              >
                                {user.currentStatus}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatTimeTrackingFull(user.totalWorkSeconds, false, null)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground font-mono">
                          {Math.round(user.totalBreakSeconds / 60)}m
                        </TableCell>
                        <TableCell className="text-right">{user.taskCount}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-medium",
                            user.efficiencyScore >= 80 && "text-emerald-500",
                            user.efficiencyScore >= 50 && user.efficiencyScore < 80 && "text-amber-500",
                            user.efficiencyScore < 50 && "text-red-500"
                          )}>
                            {user.efficiencyScore}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB: INDIVIDUAL DEEP-DIVE */}
          {/* ================================================================ */}
          <TabsContent value="individual" className="space-y-6">
            {/* User Selector */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Individual Analysis</CardTitle>
                    <CardDescription>Deep dive into a team member's performance</CardDescription>
                  </div>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      {teamStats.map(user => (
                        <SelectItem key={user.userId} value={user.userId}>
                          {user.userName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>

            {/* Individual Stats */}
            {selectedUser !== 'all' && (() => {
              const user = teamStats.find(u => u.userId === selectedUser);
              if (!user) return null;

              return (
                <>
                  {/* User Header Card */}
                  <Card className="border-border/50 bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20 ring-4 ring-primary/30 ring-offset-4 ring-offset-background">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                            {user.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold">{user.userName}</h2>
                          <p className="text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
                          <Badge
                            className={cn(
                              "mt-2",
                              user.currentStatus === 'working' && "bg-emerald-500",
                              user.currentStatus === 'break' && "bg-amber-500",
                              user.currentStatus === 'offline' && "bg-slate-500"
                            )}
                          >
                            {user.currentStatus === 'working' ? 'Currently Working' :
                              user.currentStatus === 'break' ? 'On Break' : 'Offline'}
                          </Badge>
                        </div>
                        <div className="flex gap-4">
                          <EfficiencyGauge value={user.efficiencyScore} size="lg" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Individual Stats Grid */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <StatsCard
                      title="Total Work Hours"
                      value={formatTimeTrackingFull(user.totalWorkSeconds, false, null)}
                      subtitle={`${user.sessionsCount} sessions`}
                      icon={Clock}
                      variant="primary"
                    />
                    <StatsCard
                      title="Total Break Time"
                      value={`${Math.round(user.totalBreakSeconds / 60)}m`}
                      subtitle="Break duration"
                      icon={Coffee}
                      variant="warning"
                    />
                    <StatsCard
                      title="Tasks Worked"
                      value={user.taskCount}
                      subtitle="Unique tasks"
                      icon={Briefcase}
                      variant="default"
                    />
                    <StatsCard
                      title="Avg Session"
                      value={formatTimeTrackingFull(user.avgSessionLength, false, null)}
                      subtitle="Per work session"
                      icon={Timer}
                      variant="default"
                    />
                  </div>

                  {/* Daily Timeline */}
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Daily Activity Timeline
                      </CardTitle>
                      <CardDescription>
                        Work blocks and breaks for {format(selectedDate, "MMMM d, yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {individualLoading ? (
                        <Skeleton className="h-24" />
                      ) : (
                        <DailyTimeline blocks={individualData.dayData.blocks} />
                      )}
                    </CardContent>
                  </Card>

                  {/* Charts Row */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Weekly Comparison */}
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart2 className="h-5 w-5 text-primary" />
                          This Week vs Last Week
                        </CardTitle>
                        <CardDescription>Daily hours comparison</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {individualLoading ? (
                          <Skeleton className="h-[250px]" />
                        ) : (
                          <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={individualData.weeklyComparison} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                  }}
                                  formatter={(value: number) => [`${value}h`, '']}
                                />
                                <Bar dataKey="lastWeek" name="Last Week" fill="hsl(var(--primary))" opacity={0.3} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="thisWeek" name="This Week" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Task Breakdown Pie Chart */}
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChartIcon className="h-5 w-5 text-primary" />
                          Time by Task
                        </CardTitle>
                        <CardDescription>Last 7 days breakdown</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {individualLoading ? (
                          <Skeleton className="h-[250px]" />
                        ) : individualData.taskBreakdown.length === 0 ? (
                          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">No task data available</p>
                            </div>
                          </div>
                        ) : (
                          <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={individualData.taskBreakdown}
                                  dataKey="hours"
                                  nameKey="taskName"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={80}
                                  paddingAngle={2}
                                  label={({ taskName, percentage }) => `${percentage}%`}
                                  labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                                >
                                  {individualData.taskBreakdown.map((entry, index) => (
                                    <Cell key={entry.taskId} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                  }}
                                  formatter={(value: number) => [`${value}h`, 'Hours']}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        {/* Legend */}
                        {individualData.taskBreakdown.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-3 justify-center">
                            {individualData.taskBreakdown.slice(0, 4).map((task) => (
                              <div key={task.taskId} className="flex items-center gap-1.5 text-xs">
                                <div
                                  className="h-2.5 w-2.5 rounded-sm"
                                  style={{ backgroundColor: task.color }}
                                />
                                <span className="text-muted-foreground truncate max-w-[100px]">
                                  {task.taskName}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              );
            })()}

            {selectedUser === 'all' && (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Select a team member above to view their detailed analytics</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB: PROJECT REPORTS */}
          {/* ================================================================ */}
          <TabsContent value="reports">
            <ReportsView dateFrom={dateFrom} dateTo={dateTo} />
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB: TRENDS & PATTERNS */}
          {/* ================================================================ */}
          <TabsContent value="trends" className="space-y-6">
            {trendsLoading ? (
              <div className="grid gap-6">
                <Skeleton className="h-28" />
                <div className="grid gap-6 lg:grid-cols-2">
                  <Skeleton className="h-[350px]" />
                  <Skeleton className="h-[350px]" />
                </div>
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                  <StatsCard
                    title="Weeks Analyzed"
                    value={trendsData.totalWeeksAnalyzed}
                    subtitle="Historical data range"
                    icon={Calendar}
                    variant="primary"
                  />
                  <StatsCard
                    title="Avg Weekly Hours"
                    value={`${trendsData.avgWeeklyHours}h`}
                    subtitle="Team average"
                    icon={Clock}
                    variant="default"
                  />
                  <StatsCard
                    title="Peak Day"
                    value={trendsData.peakDay}
                    subtitle="Most productive"
                    icon={TrendingUp}
                    variant="success"
                  />
                  <StatsCard
                    title="Peak Hour"
                    value={`${trendsData.peakHour}:00`}
                    subtitle="Highest activity"
                    icon={Zap}
                    variant="warning"
                  />
                </div>

                {/* Week over Week Comparison */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        This Week vs Last Week
                      </CardTitle>
                      <CardDescription>Daily hours comparison</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <WeekComparisonChart
                        thisWeek={trendsData.thisWeekDaily}
                        lastWeek={trendsData.lastWeekDaily}
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Weekly Hours Trend
                      </CardTitle>
                      <CardDescription>Total hours by week</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendsData.weeklyComparison}>
                            <defs>
                              <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number) => [`${value}h`, 'Total Hours']}
                            />
                            <Area
                              type="monotone"
                              dataKey="totalHours"
                              stroke="hsl(var(--chart-2))"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#weeklyGradient)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Efficiency Trend */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Efficiency Trend
                    </CardTitle>
                    <CardDescription>Task time vs work hours over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendsData.efficiencyTrend}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value: number, name: string) => [
                              name === 'efficiency' ? `${value}%` : `${value}h`,
                              name === 'efficiency' ? 'Efficiency' : name
                            ]}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="efficiency"
                            name="Efficiency %"
                            stroke="hsl(var(--chart-1))"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--chart-1))' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Insights */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Key Insights
                    </CardTitle>
                    <CardDescription>Automated observations based on your data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InsightCards insights={trendsData.insights} />
                  </CardContent>
                </Card>

                {/* Advanced Visualizations Row */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Capacity Planning */}
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Capacity Planning
                      </CardTitle>
                      <CardDescription>Peak hours and utilization insights</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CapacityPlanning
                        data={{
                          hourlyDistribution: Array.from({ length: 16 }, (_, i) => ({
                            hour: i + 6,
                            avgHours: heatmapData?.length > 0
                              ? heatmapData.filter(h => h.hour === i + 6).reduce((sum, h) => sum + h.totalMinutes, 0) / (7 * 60)
                              : Math.random() * 2,
                          })),
                          dailyDistribution: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => ({
                            day,
                            avgHours: Math.round((4 + Math.random() * 4) * 10) / 10,
                          })),
                          peakHour: 10,
                          quietestHour: 17,
                          busiestDay: 'Tuesday',
                          quietestDay: 'Friday',
                          avgDailyHours: summary?.totalTeamHoursToday ? summary.totalTeamHoursToday : 6.5,
                          utilizationRate: 75,
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Anomaly Detection */}
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Pattern Detection
                      </CardTitle>
                      <CardDescription>Unusual sessions and anomalies</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AnomalyDetection
                        sessions={
                          teamStats
                            .filter(u => u.totalWorkSeconds > 43200) // > 12 hours
                            .slice(0, 3)
                            .map(u => ({
                              id: u.userId,
                              userId: u.userId,
                              userName: u.userName,
                              avatarUrl: u.avatarUrl || undefined,
                              sessionDate: new Date(),
                              durationMinutes: Math.round(u.totalWorkSeconds / 60),
                              anomalyType: "too_long" as const,
                              severity: u.totalWorkSeconds > 54000 ? "high" as const : "medium" as const,
                              description: `Worked ${Math.round(u.totalWorkSeconds / 3600)} hours - unusually long session`,
                            }))
                        }
                        maxItems={3}
                      />
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TimeTracking;
