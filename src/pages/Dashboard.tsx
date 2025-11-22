import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { TaskTable } from "@/components/TaskTable";
import { TaskDialog } from "@/components/TaskDialog";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { GlobalFilters, FilterState } from "@/components/GlobalFilters";
import { QuickFilters } from "@/components/QuickFilters";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DashboardCustomization, DashboardPreferences } from "@/components/DashboardCustomization";
import { Plus } from "lucide-react";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { MainLayout } from "@/components/MainLayout";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [preferences, setPreferences] = useState<DashboardPreferences>({
    showMetrics: true,
    showFilters: true,
    showQuickFilters: true,
    visibleColumns: {
      date: true,
      client: true,
      project: true,
      taskOwner: true,
      pm: true,
      deadline: true,
      submission: true,
      delay: true,
      collaborators: true,
      status: true,
      urgency: true,
    },
  });

  // Enable real-time notifications
  useTaskNotifications(user?.id);
  
  const [filters, setFilters] = useState<FilterState>({
    year: "all",
    month: "all",
    status: "all",
    urgency: "all",
    clientId: "all",
    projectName: "all",
    teamMemberId: "all",
    projectManagerId: "all",
    highlightToday: false,
    highlightImmediate: false,
    highlightDelayed: false,
    highlightInApproval: false,
    delay: "all",
    quickFilter: [],
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await fetchUserRole(session.user.id);
    await fetchUserProfile(session.user.id);
    await fetchUserPreferences(session.user.id);
  };

  const fetchUserPreferences = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("show_metrics, show_filters, dashboard_view")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching preferences:", error);
      return;
    }

    if (data) {
      const dashboardView = data.dashboard_view 
        ? (typeof data.dashboard_view === 'string' 
            ? JSON.parse(data.dashboard_view) 
            : data.dashboard_view)
        : {};

      setPreferences({
        showMetrics: data.show_metrics ?? true,
        showFilters: data.show_filters ?? true,
        showQuickFilters: dashboardView.showQuickFilters ?? true,
        visibleColumns: dashboardView.visibleColumns ?? preferences.visibleColumns,
      });
    }
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
      .select("status, mood")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else {
      setUserProfile(data);
    }
  };

  const canCreateTasks = userRole === "project_owner" || userRole === "project_manager";

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Breadcrumbs />
          {user && (
            <DashboardCustomization
              userId={user.id}
              preferences={preferences}
              onPreferencesChange={setPreferences}
            />
          )}
        </div>
        
        {preferences.showMetrics && <DashboardMetrics filters={filters} />}

        {preferences.showFilters && (
          <GlobalFilters filters={filters} onFiltersChange={setFilters} />
        )}

        {preferences.showQuickFilters && (
          <div className="flex items-center justify-center py-4">
            <QuickFilters 
              activeFilters={filters.quickFilter} 
              onFiltersChange={(quickFilter) => setFilters({ ...filters, quickFilter })} 
              userRole={userRole}
              userId={user?.id}
            />
          </div>
        )}

        <div className="space-y-4">
          <TaskTable 
            filters={filters} 
            userRole={userRole} 
            userId={user?.id || ""}
            visibleColumns={preferences.visibleColumns}
            canCreateTasks={canCreateTasks}
            onCreateTask={() => setDialogOpen(true)}
            onDuplicate={(data) => {
              setDuplicateData(data);
              setDialogOpen(true);
            }}
          />
        </div>
      </div>

      {dialogOpen && (
        <TaskDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setDuplicateData(null);
          }}
          userRole={userRole}
          duplicateData={duplicateData}
        />
      )}
    </MainLayout>
  );
};

export default Dashboard;
