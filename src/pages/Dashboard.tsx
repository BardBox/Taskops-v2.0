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
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LogOut, Plus, Settings, User as UserIcon, Sliders, ArrowRight, BarChart3, Home } from "lucide-react";
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
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useLocation } from "react-router-dom";

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

  // Enable real-time notifications
  useTaskNotifications(user?.id);
  const [filters, setFilters] = useState<FilterState>({
    year: "all",
    month: "all",
    status: "all",
    urgency: "all",
    clientId: "all",
    teamMemberId: "all",
    projectManagerId: "all",
    highlightToday: false,
    delay: "all",
  });

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchUserRole(session.user.id);
        fetchUserProfile(session.user.id);
      }
    });

    // Set up real-time subscription for profile updates
    const profileSubscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          setUserProfile(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      profileSubscription.unsubscribe();
    };
  }, [navigate, user?.id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await Promise.all([
      fetchUserRole(session.user.id),
      fetchUserProfile(session.user.id)
    ]);
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

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else {
      setUserProfile(data);
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
  const hasAdminAccess = userRole === "project_manager" || userRole === "project_owner";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/bardbox-logo.png" 
              alt="BardBox" 
              className="h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold">
                TaskOPS<sup className="text-sm">™</sup>
              </h1>
              <p className="text-xs text-muted-foreground capitalize">{userRole.replace("_", " ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter userId={user?.id || ""} />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-12 w-12">
                  {userProfile?.avatar_url ? (
                    <img 
                      src={`${userProfile.avatar_url}?t=${Date.now()}`}
                      alt={userProfile.full_name} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {userProfile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="hidden sm:inline font-bold">{userProfile?.full_name || user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {location.pathname !== "/dashboard" && (
                <DropdownMenuItem 
                  onClick={() => navigate("/dashboard")}
                  className="cursor-pointer"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Homepage
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => navigate("/analytics")}
                className="cursor-pointer"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {hasAdminAccess && (
                <>
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => navigate("/account-settings")}>
                <UserIcon className="h-4 w-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/preferences")}>
                <Sliders className="h-4 w-4 mr-2" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Breadcrumbs />
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
