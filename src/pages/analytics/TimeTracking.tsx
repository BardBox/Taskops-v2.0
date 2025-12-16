import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Clock, Timer, Users, Briefcase, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatTimeTrackingFull } from "@/hooks/useTaskTimeTracking";

interface TimeTrackingData {
  id: string;
  task_id: string;
  user_id: string;
  tracking_status: string;
  total_seconds: number;
  started_at: string | null;
  stopped_at: string | null;
  task?: {
    task_name: string;
    client_id: string | null;
    project_id: string | null;
    clients?: { name: string } | null;
    projects?: { name: string } | null;
  };
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface UserTimeStats {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  totalSeconds: number;
  taskCount: number;
}

interface ClientTimeStats {
  clientId: string;
  clientName: string;
  totalSeconds: number;
  taskCount: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const TimeTracking = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [timeData, setTimeData] = useState<TimeTrackingData[]>([]);
  const [userStats, setUserStats] = useState<UserTimeStats[]>([]);
  const [clientStats, setClientStats] = useState<ClientTimeStats[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [activeTrackers, setActiveTrackers] = useState(0);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  useEffect(() => {
    fetchTimeData();
  }, [dateFrom, dateTo]);

  const checkAuthAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    await fetchTimeData();
  };

  const fetchTimeData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("task_time_tracking")
        .select(`
          *,
          profiles:user_id(full_name, avatar_url),
          tasks:task_id(
            task_name,
            client_id,
            project_id,
            clients(name),
            projects(name)
          )
        `);

      if (dateFrom) {
        query = query.gte('started_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('started_at', dateTo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const records = (data || []).map((record: any) => ({
        ...record,
        task: record.tasks,
      }));

      setTimeData(records);
      
      // Calculate stats
      const total = records.reduce((sum: number, r: any) => sum + (r.total_seconds || 0), 0);
      setTotalTime(total);
      setActiveTrackers(records.filter((r: any) => r.tracking_status === 'active').length);

      // User stats
      const userMap = new Map<string, UserTimeStats>();
      records.forEach((r: any) => {
        const existing = userMap.get(r.user_id) || {
          userId: r.user_id,
          userName: r.profiles?.full_name || 'Unknown',
          avatarUrl: r.profiles?.avatar_url,
          totalSeconds: 0,
          taskCount: 0,
        };
        existing.totalSeconds += r.total_seconds || 0;
        existing.taskCount += 1;
        userMap.set(r.user_id, existing);
      });
      setUserStats(Array.from(userMap.values()).sort((a, b) => b.totalSeconds - a.totalSeconds));

      // Client stats
      const clientMap = new Map<string, ClientTimeStats>();
      records.forEach((r: any) => {
        const clientId = r.task?.client_id || 'no-client';
        const clientName = r.task?.clients?.name || 'No Client';
        const existing = clientMap.get(clientId) || {
          clientId,
          clientName,
          totalSeconds: 0,
          taskCount: 0,
        };
        existing.totalSeconds += r.total_seconds || 0;
        existing.taskCount += 1;
        clientMap.set(clientId, existing);
      });
      setClientStats(Array.from(clientMap.values()).sort((a, b) => b.totalSeconds - a.totalSeconds));

    } catch (error) {
      console.error('Error fetching time tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
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
          <div className="mt-4 space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Time Tracking Analytics</h1>
              <p className="text-muted-foreground">Monitor time spent on tasks across your team</p>
            </div>
            <TimeRangeFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Total Time Tracked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTimeTrackingFull(totalTime, false, null)}</div>
              <p className="text-xs text-muted-foreground">{timeData.length} tracking records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Timer className="h-4 w-4 text-green-500" />
                Active Timers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTrackers}</div>
              <p className="text-xs text-muted-foreground">Currently tracking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.length}</div>
              <p className="text-xs text-muted-foreground">With time records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-purple-500" />
                Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientStats.length}</div>
              <p className="text-xs text-muted-foreground">With time allocated</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Time by Team Member</CardTitle>
              <CardDescription>Hours tracked per person</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  hours: { label: "Hours", color: "hsl(var(--chart-1))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userStats.slice(0, 10).map(u => ({
                    name: u.userName.split(' ')[0],
                    hours: Math.round(u.totalSeconds / 3600 * 10) / 10,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time by Client</CardTitle>
              <CardDescription>Distribution across clients</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  value: { label: "Hours", color: "hsl(var(--chart-2))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clientStats.slice(0, 5).map(c => ({
                        name: c.clientName,
                        value: Math.round(c.totalSeconds / 3600 * 10) / 10,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}h`}
                    >
                      {clientStats.slice(0, 5).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Team Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Team Time Leaderboard</CardTitle>
            <CardDescription>Ranked by total time tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Team Member</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  <TableHead className="text-right">Total Time</TableHead>
                  <TableHead className="text-right">Avg per Task</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userStats.slice(0, 10).map((user, index) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback>{user.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span>{user.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{user.taskCount}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatTimeTrackingFull(user.totalSeconds, false, null)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatTimeTrackingFull(Math.round(user.totalSeconds / user.taskCount), false, null)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default TimeTracking;
