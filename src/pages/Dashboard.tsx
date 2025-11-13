import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskTable } from "@/components/TaskTable";
import { TaskDialog } from "@/components/TaskDialog";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { GlobalFilters, FilterState } from "@/components/GlobalFilters";
import { LogOut, Plus, Home, Settings } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    year: "all",
    month: "all",
    status: "all",
    urgency: "all",
    clientId: "all",
    teamMemberId: "all",
    projectManagerId: "all",
    highlightToday: false,
  });

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
    }
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

  const canCreateTasks = userRole === "project_manager" || userRole === "project_owner";
  const isOwner = userRole === "project_owner";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              title="Home"
            >
              <Home className="h-5 w-5" />
            </Button>
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-xl font-bold text-primary-foreground">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">BardBox TaskOPS™</h1>
              <p className="text-sm text-muted-foreground capitalize">{userRole.replace("_", " ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <DashboardMetrics filters={filters} />

        <GlobalFilters filters={filters} onFiltersChange={setFilters} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Tasks</CardTitle>
            {canCreateTasks && (
              <Button onClick={() => setDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <TaskTable userRole={userRole} userId={user?.id || ""} filters={filters} />
          </CardContent>
        </Card>
      </main>

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default Dashboard;
