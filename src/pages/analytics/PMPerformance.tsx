import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, CheckCircle, Clock, AlertCircle, TrendingUp, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  delayedTasks: number;
  qualityStars: number;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  onTime: number;
  delayed: number;
  avgCompletionRate: number;
}

export default function PMPerformance() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pmId = searchParams.get("id");
  const pmName = searchParams.get("name");
  
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    pending: 0,
    onTime: 0,
    delayed: 0,
    avgCompletionRate: 0,
  });

  useEffect(() => {
    if (!pmId || !pmName) {
      navigate("/analytics");
      return;
    }
    fetchPMData();
  }, [pmId, pmName, navigate]);

  const fetchPMData = async () => {
    try {
      // Fetch all tasks assigned by this PM
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name)
        `)
        .eq("assigned_by_id", pmId);

      if (tasksError) throw tasksError;

      // Calculate team member stats
      const memberStats = new Map<string, TeamMember>();
      let totalCompleted = 0;
      let totalOnTime = 0;
      let totalDelayed = 0;

      tasksData?.forEach((task: any) => {
        const assigneeId = task.assignee.id;
        const assigneeName = task.assignee.full_name;

        if (!memberStats.has(assigneeId)) {
          memberStats.set(assigneeId, {
            id: assigneeId,
            name: assigneeName,
            totalTasks: 0,
            completedTasks: 0,
            onTimeTasks: 0,
            delayedTasks: 0,
            qualityStars: 0,
          });
        }

        const member = memberStats.get(assigneeId)!;
        member.totalTasks++;

        if (task.status === "Approved" || task.status === "Done") {
          member.completedTasks++;
          totalCompleted++;

          // Calculate delay
          if (task.deadline && task.actual_delivery) {
            const delay = new Date(task.actual_delivery).getTime() - new Date(task.deadline).getTime();
            const delayDays = Math.ceil(delay / (1000 * 60 * 60 * 24));
            
            if (delayDays <= 0) {
              member.onTimeTasks++;
              totalOnTime++;
            } else {
              member.delayedTasks++;
              totalDelayed++;
            }
          }
        }
      });

      // Fetch quality stars for each team member
      for (const [memberId, member] of memberStats) {
        const { data: appreciations } = await supabase
          .from("task_appreciations")
          .select("id")
          .in("task_id", tasksData?.filter(t => t.assignee_id === memberId).map(t => t.id) || []);
        
        member.qualityStars = appreciations?.length || 0;
      }

      const members = Array.from(memberStats.values());
      setTeamMembers(members);

      setTaskStats({
        total: tasksData?.length || 0,
        completed: totalCompleted,
        pending: (tasksData?.length || 0) - totalCompleted,
        onTime: totalOnTime,
        delayed: totalDelayed,
        avgCompletionRate: tasksData?.length ? (totalCompleted / tasksData.length) * 100 : 0,
      });

    } catch (error) {
      console.error("Error fetching PM data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span>/</span>
            <Link to="/analytics" className="hover:text-foreground">Performance Metrics</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{pmName}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{pmName}</h1>
              <p className="text-muted-foreground">Project Manager Performance</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks Assigned</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {taskStats.completed} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.avgCompletionRate.toFixed(1)}%</div>
              <Progress value={taskStats.avgCompletionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">On-Time Deliveries</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-notification-success">{taskStats.onTime}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {taskStats.completed > 0 ? ((taskStats.onTime / taskStats.completed) * 100).toFixed(1) : 0}% on time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMembers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Under supervision</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Members Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No team members assigned</p>
              ) : (
                teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold">{member.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{member.totalTasks} tasks</span>
                        <span>•</span>
                        <span>{member.completedTasks} completed</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">On Time</p>
                        <p className="text-lg font-bold text-notification-success">{member.onTimeTasks}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Delayed</p>
                        <p className="text-lg font-bold text-notification-error">{member.delayedTasks}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-star text-star" />
                        <span className="font-bold">{member.qualityStars}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
