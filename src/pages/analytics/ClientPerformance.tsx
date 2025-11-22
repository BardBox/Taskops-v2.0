import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FolderKanban, CheckCircle, Clock, AlertCircle, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface Project {
  id: string;
  name: string;
  taskCount: number;
  completedTasks: number;
  onTimeTasks: number;
  delayedTasks: number;
}

interface Task {
  id: string;
  task_name: string;
  status: string;
  urgency: string;
  deadline: string | null;
  actual_delivery: string | null;
  date: string;
  project_name: string | null;
  assignee_name: string;
  delay_days: number;
}

interface ClientStats {
  totalTasks: number;
  completed: number;
  pending: number;
  onTime: number;
  delayed: number;
  completionRate: number;
}

export default function ClientPerformance() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("id");
  const clientName = searchParams.get("name");
  
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<ClientStats>({
    totalTasks: 0,
    completed: 0,
    pending: 0,
    onTime: 0,
    delayed: 0,
    completionRate: 0,
  });

  useEffect(() => {
    if (!clientId || !clientName) {
      navigate("/analytics");
      return;
    }
    fetchClientData();
  }, [clientId, clientName, navigate]);

  const fetchClientData = async () => {
    try {
      // Fetch all tasks for this client with project info
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          project:projects(id, name),
          assignee:profiles!tasks_assignee_id_fkey(full_name, creative_title)
        `)
        .eq("client_id", clientId)
        .order("date", { ascending: false })
        .limit(20);

      if (tasksError) throw tasksError;

      // Calculate project stats
      const projectStats = new Map<string, Project>();
      let totalCompleted = 0;
      let totalOnTime = 0;
      let totalDelayed = 0;

      tasksData?.forEach((task: any) => {
        const projectId = task.project?.id || "no-project";
        const projectName = task.project?.name || "No Project";

        if (!projectStats.has(projectId)) {
          projectStats.set(projectId, {
            id: projectId,
            name: projectName,
            taskCount: 0,
            completedTasks: 0,
            onTimeTasks: 0,
            delayedTasks: 0,
          });
        }

        const project = projectStats.get(projectId)!;
        project.taskCount++;

        if (task.status === "Approved" || task.status === "Done") {
          project.completedTasks++;
          totalCompleted++;

          // Calculate delay
          if (task.deadline && task.actual_delivery) {
            const delay = new Date(task.actual_delivery).getTime() - new Date(task.deadline).getTime();
            const delayDays = Math.ceil(delay / (1000 * 60 * 60 * 24));
            
            if (delayDays <= 0) {
              project.onTimeTasks++;
              totalOnTime++;
            } else {
              project.delayedTasks++;
              totalDelayed++;
            }
          }
        }
      });

      setProjects(Array.from(projectStats.values()));

      // Format recent tasks
      const formattedTasks = tasksData?.map((task: any) => ({
        id: task.id,
        task_name: task.task_name,
        status: task.status,
        urgency: task.urgency,
        deadline: task.deadline,
        actual_delivery: task.actual_delivery,
        date: task.date,
        project_name: task.project?.name || null,
        assignee_name: task.assignee.full_name,
        delay_days: task.deadline && task.actual_delivery
          ? Math.ceil((new Date(task.actual_delivery).getTime() - new Date(task.deadline).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      })) || [];

      setRecentTasks(formattedTasks);

      setStats({
        totalTasks: tasksData?.length || 0,
        completed: totalCompleted,
        pending: (tasksData?.length || 0) - totalCompleted,
        onTime: totalOnTime,
        delayed: totalDelayed,
        completionRate: tasksData?.length ? (totalCompleted / tasksData.length) * 100 : 0,
      });

    } catch (error) {
      console.error("Error fetching client data:", error);
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
            <span className="text-foreground font-medium">{clientName}</span>
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
              <h1 className="text-3xl font-bold">{clientName}</h1>
              <p className="text-muted-foreground">Client Performance Overview</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {projects.length} projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</div>
              <Progress value={stats.completionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-notification-success">{stats.onTime}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completed > 0 ? ((stats.onTime / stats.completed) * 100).toFixed(1) : 0}% on time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Delayed Tasks</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-notification-error">{stats.delayed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completed > 0 ? ((stats.delayed / stats.completed) * 100).toFixed(1) : 0}% delayed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No projects found</p>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold">{project.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.taskCount} tasks • {project.completedTasks} completed
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">On Time</p>
                        <p className="text-lg font-bold text-notification-success">{project.onTimeTasks}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Delayed</p>
                        <p className="text-lg font-bold text-notification-error">{project.delayedTasks}</p>
                      </div>
                      <Progress 
                        value={project.taskCount > 0 ? (project.completedTasks / project.taskCount) * 100 : 0} 
                        className="w-24"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No tasks found</p>
              ) : (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{task.task_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.date), "MMM dd, yyyy")}
                        </span>
                        {task.project_name && <span>• {task.project_name}</span>}
                        <span>• {task.assignee_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={
                          task.status === "Approved" ? "bg-status-approved text-status-approved-foreground" :
                          task.status === "Done" ? "bg-status-done text-status-done-foreground" :
                          task.status === "Doing" ? "bg-status-doing text-status-doing-foreground" :
                          "bg-status-todo text-status-todo-foreground"
                        }
                      >
                        {task.status}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={
                          task.urgency === "Immediate" ? "border-urgency-immediate text-urgency-immediate" :
                          task.urgency === "High" ? "border-urgency-high text-urgency-high" :
                          task.urgency === "Mid" ? "border-urgency-medium text-urgency-medium" :
                          "border-urgency-low text-urgency-low"
                        }
                      >
                        {task.urgency}
                      </Badge>
                      {task.delay_days > 0 && (
                        <Badge variant="destructive">+{task.delay_days}d</Badge>
                      )}
                      {task.delay_days <= 0 && (task.status === "Approved" || task.status === "Done") && (
                        <Badge className="bg-status-approved text-status-approved-foreground">On Time</Badge>
                      )}
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
