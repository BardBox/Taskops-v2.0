import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Settings, Sliders, Home, Award, TrendingUp, Trophy, Medal, BarChart3, Star, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { IndividualPerformance } from "@/components/IndividualPerformance";
import { format } from "date-fns";
import { exportToPDF } from "@/utils/pdfExport";
import { Download } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface TeamMemberPerformance {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  delayedTasks: number;
  avgDelayDays: number;
  weightedScore: number;
  qualityStars: number;
  completionRate: number;
  onTimeRate: number;
}

interface ClientPerformance {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  avgDelayDays: number;
  weightedScore: number;
}

interface ProjectManagerPerformance {
  id: string;
  name: string;
  tasksAssigned: number;
  completedTasks: number;
  avgDelayDays: number;
  teamPerformanceScore: number;
}

const Analytics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [teamPerformance, setTeamPerformance] = useState<TeamMemberPerformance[]>([]);
  const [clientPerformance, setClientPerformance] = useState<ClientPerformance[]>([]);
  const [pmPerformance, setPmPerformance] = useState<ProjectManagerPerformance[]>([]);
  
  // Filters
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [viewFilter, setViewFilter] = useState<string>("all");
  const [selectedIndividualId, setSelectedIndividualId] = useState<string | null>(null);

  const handleExportOverview = async () => {
    toast.info("Generating PDF...");
    await exportToPDF(
      "analytics-overview",
      `analytics-overview-${new Date().toISOString().split('T')[0]}.pdf`,
      "Analytics Overview Report"
    );
    toast.success("PDF exported successfully!");
  };

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await fetchUserRole(session.user.id);
    setLoading(false);
  };

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching role:", error);
    } else {
      setUserRole(data?.role || "");
      fetchAnalytics();
    }
  };

  const fetchAnalytics = async () => {
    await Promise.all([
      fetchTeamMemberPerformance(),
      fetchClientPerformance(),
      fetchProjectManagerPerformance(),
    ]);
  };

  const calculateWeightedScore = (tasks: any[]) => {
    const urgencyWeights = { Low: 1, Mid: 2, High: 3 };
    let totalWeight = 0;
    let earnedWeight = 0;

    tasks.forEach((task) => {
      const weight = urgencyWeights[task.urgency as keyof typeof urgencyWeights] || 1;
      totalWeight += weight;
      
      if (task.status === "Approved" || task.status === "Done") {
        // Reduce score for delayed tasks
        const delayPenalty = task.delay_days > 0 ? Math.max(0, 1 - (task.delay_days * 0.1)) : 1;
        earnedWeight += weight * delayPenalty;
      }
    });

    return totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
  };

  const getPerformanceGrade = (score: number, onTimeRate: number) => {
    // This function is deprecated - we now use star-based quality indicators
    return { grade: "N/A", color: "" };
  };

  const fetchTeamMemberPerformance = async () => {
    const { data: tasks } = await supabase
      .from("taskops_filtered_tasks" as any)
      .select("*");

    if (!tasks) return;

    // Fetch quality stars (appreciations) for all users
    const { data: appreciations } = await supabase
      .from("task_appreciations" as any)
      .select("task_id");

    const appreciationMap = new Map<string, number>();
    appreciations?.forEach((app: any) => {
      const count = appreciationMap.get(app.task_id) || 0;
      appreciationMap.set(app.task_id, count + 1);
    });

    const memberMap = new Map<string, any>();

    tasks.forEach((task: any) => {
      const memberId = task.assignee_id;
      if (!memberId) return;

      if (!memberMap.has(memberId)) {
        memberMap.set(memberId, {
          id: memberId,
          name: task.assignee_name || "Unknown",
          tasks: [],
          totalStars: 0,
        });
      }
      const stars = appreciationMap.get(task.id) || 0;
      memberMap.get(memberId).tasks.push(task);
      memberMap.get(memberId).totalStars += stars;
    });

    const performance: TeamMemberPerformance[] = Array.from(memberMap.values()).map((member) => {
      const totalTasks = member.tasks.length;
      const completedTasks = member.tasks.filter(
        (t: any) => t.status === "Approved" || t.status === "Done"
      ).length;
      const onTimeTasks = member.tasks.filter(
        (t: any) => (t.status === "Approved" || t.status === "Done") && (t.delay_days || 0) <= 0
      ).length;
      const delayedTasks = member.tasks.filter(
        (t: any) => (t.delay_days || 0) > 0
      ).length;
      const avgDelayDays = member.tasks.reduce((sum: number, t: any) => sum + (t.delay_days || 0), 0) / totalTasks;
      const weightedScore = calculateWeightedScore(member.tasks);
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const onTimeRate = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;

      return {
        id: member.id,
        name: member.name,
        totalTasks,
        completedTasks,
        onTimeTasks,
        delayedTasks,
        avgDelayDays: Math.max(0, avgDelayDays),
        weightedScore,
        qualityStars: member.totalStars,
        completionRate,
        onTimeRate,
      };
    });

    // Sort by weighted score
    performance.sort((a, b) => b.weightedScore - a.weightedScore);
    setTeamPerformance(performance);
  };

  const fetchClientPerformance = async () => {
    const { data: tasks } = await supabase
      .from("taskops_filtered_tasks" as any)
      .select("*");

    if (!tasks) return;

    const clientMap = new Map<string, any>();

    tasks.forEach((task: any) => {
      const clientId = task.client_id;
      if (!clientId) return;

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          id: clientId,
          name: task.client_name || "Unknown",
          tasks: [],
        });
      }
      clientMap.get(clientId).tasks.push(task);
    });

    const performance: ClientPerformance[] = Array.from(clientMap.values()).map((client) => {
      const totalTasks = client.tasks.length;
      const completedTasks = client.tasks.filter(
        (t: any) => t.status === "Approved" || t.status === "Done"
      ).length;
      const avgDelayDays = client.tasks.reduce((sum: number, t: any) => sum + (t.delay_days || 0), 0) / totalTasks;
      const weightedScore = calculateWeightedScore(client.tasks);

      return {
        id: client.id,
        name: client.name,
        totalTasks,
        completedTasks,
        avgDelayDays: Math.max(0, avgDelayDays),
        weightedScore,
      };
    });

    performance.sort((a, b) => b.totalTasks - a.totalTasks);
    setClientPerformance(performance);
  };

  const fetchProjectManagerPerformance = async () => {
    const { data: tasks } = await supabase
      .from("taskops_filtered_tasks" as any)
      .select("*");

    if (!tasks) return;

    const pmMap = new Map<string, any>();

    tasks.forEach((task: any) => {
      const pmId = task.assigned_by_id;
      if (!pmId) return;

      if (!pmMap.has(pmId)) {
        pmMap.set(pmId, {
          id: pmId,
          name: task.assigned_by_name || "Unknown",
          tasks: [],
        });
      }
      pmMap.get(pmId).tasks.push(task);
    });

    const performance: ProjectManagerPerformance[] = Array.from(pmMap.values()).map((pm) => {
      const tasksAssigned = pm.tasks.length;
      const completedTasks = pm.tasks.filter(
        (t: any) => t.status === "Approved" || t.status === "Done"
      ).length;
      const avgDelayDays = pm.tasks.reduce((sum: number, t: any) => sum + (t.delay_days || 0), 0) / tasksAssigned;
      const teamPerformanceScore = calculateWeightedScore(pm.tasks);

      return {
        id: pm.id,
        name: pm.name,
        tasksAssigned,
        completedTasks,
        avgDelayDays: Math.max(0, avgDelayDays),
        teamPerformanceScore,
      };
    });

    performance.sort((a, b) => b.teamPerformanceScore - a.teamPerformanceScore);
    setPmPerformance(performance);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isOwner = userRole === "project_owner";
  const hasAdminAccess = userRole === "project_manager" || userRole === "project_owner";

  // Calculate team averages for comparison
  const teamAverages = {
    weightedScore: teamPerformance.length > 0 
      ? teamPerformance.reduce((sum, m) => sum + m.weightedScore, 0) / teamPerformance.length 
      : 0,
    completionRate: teamPerformance.length > 0 
      ? teamPerformance.reduce((sum, m) => sum + m.completionRate, 0) / teamPerformance.length 
      : 0,
    onTimeRate: teamPerformance.length > 0 
      ? teamPerformance.reduce((sum, m) => sum + m.onTimeRate, 0) / teamPerformance.length 
      : 0,
    avgDelayDays: teamPerformance.length > 0 
      ? teamPerformance.reduce((sum, m) => sum + m.avgDelayDays, 0) / teamPerformance.length 
      : 0,
  };

  const selectedIndividual = selectedIndividualId 
    ? teamPerformance.find(m => m.id === selectedIndividualId) 
    : null;

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-star" />;
    if (index === 1) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (index === 2) return <Medal className="h-5 w-5 text-muted-foreground/70" />;
    return <Award className="h-4 w-4 text-muted-foreground" />;
  };

  const chartConfig = {
    score: {
      label: "Performance Score",
      color: "hsl(var(--primary))",
    },
    tasks: {
      label: "Tasks",
      color: "hsl(var(--secondary))",
    },
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/bardbox-logo.png" 
              alt="BardBox" 
              className="h-10 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl font-bold">Performance Metrics</h1>
              <p className="text-sm text-muted-foreground capitalize">{userRole.replace("_", " ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter userId={user?.id || ""} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/analytics")}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Performance Metrics
                </DropdownMenuItem>
                {hasAdminAccess && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/account-settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/preferences")}>
                  <Sliders className="mr-2 h-4 w-4" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Breadcrumbs />
        
        {/* Show Individual Performance or Overview */}
        {selectedIndividual ? (
          <IndividualPerformance
            individualId={selectedIndividual.id}
            individualName={selectedIndividual.name}
            onBack={() => setSelectedIndividualId(null)}
            teamAverage={teamAverages}
          />
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Performance Analytics</h2>
                <p className="text-muted-foreground">Track team performance, client metrics, and quality indicators</p>
              </div>
              <Button onClick={handleExportOverview} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Overview
              </Button>
            </div>

            <div id="analytics-overview">
            <Tabs defaultValue="team" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="managers">Project Managers</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          {/* Team Members Performance */}
          <TabsContent value="team" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teamPerformance.slice(0, 3).map((member, index) => (
                <Card 
                  key={member.id} 
                  className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedIndividualId(member.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getRankIcon(index)}
                        {member.name}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-star text-star" />
                        <span className="font-bold">{member.qualityStars}</span>
                      </div>
                    </div>
                    <CardDescription>Rank #{index + 1} • {member.totalTasks} tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Performance Score</span>
                        <span className="font-bold">{member.weightedScore.toFixed(1)}%</span>
                      </div>
                      <Progress value={member.weightedScore} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="text-lg font-bold">{member.completedTasks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">On Time</p>
                        <p className="text-lg font-bold text-notification-success">{member.onTimeTasks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Delayed</p>
                        <p className="text-lg font-bold text-notification-error">{member.delayedTasks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Delay</p>
                        <p className="text-lg font-bold">{member.avgDelayDays.toFixed(1)}d</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Quality Stars</p>
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: Math.min(5, member.qualityStars) }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-star text-star" />
                          ))}
                          {member.qualityStars > 5 && (
                            <span className="text-sm font-semibold ml-1">+{member.qualityStars - 5}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>{member.onTimeRate.toFixed(1)}% on-time delivery</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Full Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle>Team Leaderboard</CardTitle>
                <CardDescription>Performance rankings based on weighted task completion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamPerformance.map((member, index) => (
                    <div key={member.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl font-bold text-muted-foreground w-8">#{index + 1}</span>
                        {getRankIcon(index)}
                        <div className="flex-1">
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.totalTasks} tasks • {member.completedTasks} completed</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-star text-star" />
                          <span className="font-semibold">{member.qualityStars}</span>
                        </div>
                        <p className="text-sm font-bold">{member.weightedScore.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Comparison</CardTitle>
                <CardDescription>Weighted performance scores across team members</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamPerformance.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="name" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="weightedScore" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Project Managers Performance */}
          <TabsContent value="managers" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pmPerformance.map((pm, index) => (
                <Card 
                  key={pm.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => window.location.href = `/analytics/pm?id=${pm.id}&name=${encodeURIComponent(pm.name)}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{pm.name}</CardTitle>
                      {index < 3 && getRankIcon(index)}
                    </div>
                    <CardDescription>Assigned {pm.tasksAssigned} tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Team Performance</span>
                        <span className="font-bold">{pm.teamPerformanceScore.toFixed(1)}%</span>
                      </div>
                      <Progress value={pm.teamPerformanceScore} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="text-lg font-bold">{pm.completedTasks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Delay</p>
                        <p className="text-lg font-bold">{pm.avgDelayDays.toFixed(1)}d</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>PM Performance Chart</CardTitle>
                <CardDescription>Team performance scores by project manager</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pmPerformance}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="name" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="teamPerformanceScore" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Client Performance */}
          <TabsContent value="clients" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {clientPerformance.slice(0, 4).map((client) => (
                <Card 
                  key={client.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => window.location.href = `/analytics/client?id=${client.id}&name=${encodeURIComponent(client.name)}`}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <CardDescription>{client.totalTasks} total tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Performance Score</span>
                        <span className="font-bold">{client.weightedScore.toFixed(1)}%</span>
                      </div>
                      <Progress value={client.weightedScore} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="text-lg font-bold">{client.completedTasks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Delay</p>
                        <p className="text-lg font-bold">{client.avgDelayDays.toFixed(1)}d</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Client Task Distribution</CardTitle>
                <CardDescription>Task volume by client</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={clientPerformance.slice(0, 8)}
                        dataKey="totalTasks"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {clientPerformance.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Analytics;
