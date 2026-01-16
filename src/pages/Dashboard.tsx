import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { TaskTable, DEFAULT_COLUMN_WIDTHS } from "@/components/TaskTable";
import { TaskDialog } from "@/components/TaskDialog";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { GlobalFilters, FilterState } from "@/components/GlobalFilters";
import { QuickFilters } from "@/components/QuickFilters";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DashboardPreferences, DEFAULT_PREFERENCES } from "@/components/DashboardCustomization";
import { Plus } from "lucide-react";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { MainLayout } from "@/components/MainLayout";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { cn } from "@/lib/utils";

interface ColumnWidths {
  date: number;
  task: number;
  client: number;
  project: number;
  taskOwner: number;
  pm: number;
  collaborators: number;
  deadline: number;
  submission: number;
  delay: number;
  time: number;
  status: number;
  urgency: number;
}


// ... (other imports)

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = (searchParams.get("view") as "ops" | "growth") || "ops";

  const setViewMode = (mode: "ops" | "growth") => {
    setSearchParams({ view: mode });
  };

  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_COLUMN_WIDTHS);
  const columnWidthSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Enable real-time notifications
  useTaskNotifications(user?.id);
  const { isFocusMode } = useFocusMode();

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

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (columnWidthSaveTimerRef.current) {
        clearTimeout(columnWidthSaveTimerRef.current);
      }
    };
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

      // Load column widths if saved
      if (dashboardView.columnWidths) {
        setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS, ...dashboardView.columnWidths });
      }
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
      console.log("Dashboard: Fetched user role:", data?.role);
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

  useEffect(() => {
    if (userRole === "sales_team" && viewMode === 'ops') {
      setViewMode('growth');
    }
  }, [userRole, viewMode]);

  const canCreateTasks = userRole === "project_owner" || userRole === "project_manager";

  const handleResetPreferences = async () => {
    setPreferences(DEFAULT_PREFERENCES);
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);

    // Save reset to database
    if (user?.id) {
      await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          show_metrics: DEFAULT_PREFERENCES.showMetrics,
          show_filters: DEFAULT_PREFERENCES.showFilters,
          dashboard_view: JSON.stringify({
            showQuickFilters: DEFAULT_PREFERENCES.showQuickFilters,
            visibleColumns: DEFAULT_PREFERENCES.visibleColumns,
            columnWidths: DEFAULT_COLUMN_WIDTHS,
          }),
        }, { onConflict: "user_id" });
    }
  };


  const handleColumnWidthsChange = useCallback((widths: ColumnWidths) => {
    setColumnWidths(widths);

    // Clear existing timer
    if (columnWidthSaveTimerRef.current) {
      clearTimeout(columnWidthSaveTimerRef.current);
    }

    // Debounce save to database (500ms delay)
    columnWidthSaveTimerRef.current = setTimeout(async () => {
      if (user?.id) {
        const currentDashboardView = {
          showQuickFilters: preferences.showQuickFilters,
          visibleColumns: preferences.visibleColumns,
          columnWidths: widths,
        };

        await supabase
          .from("user_preferences")
          .upsert({
            user_id: user.id,
            dashboard_view: JSON.stringify(currentDashboardView),
          }, { onConflict: "user_id" });
      }
    }, 500);
  }, [user?.id, preferences.showQuickFilters, preferences.visibleColumns]);

  return (
    <MainLayout>
      <div className={cn("container mx-auto px-3 md:px-4 py-4 md:py-8 space-y-4 md:space-y-6 transition-all", isFocusMode && "max-w-full px-2 py-2 space-y-2")}>
        {!isFocusMode && (
          <div className="flex items-center justify-between">
            <Breadcrumbs />
          </div>
        )}

        {preferences.showMetrics && !isFocusMode && <DashboardMetrics filters={filters} />}

        {preferences.showFilters && !isFocusMode && (
          <GlobalFilters filters={filters} onFiltersChange={setFilters} />
        )}

        {preferences.showQuickFilters && !isFocusMode && (
          <div className="sticky top-14 z-40 bg-background py-2 md:py-3 -mx-3 md:-mx-4 px-3 md:px-4 border-b border-border/30">
            <div className="flex items-center justify-center overflow-hidden">
              <QuickFilters
                activeFilters={filters.quickFilter}
                onFiltersChange={(quickFilter) => setFilters({ ...filters, quickFilter })}
                userRole={userRole}
                userId={user?.id}
              />
            </div>
          </div>
        )}
        <div className="space-y-4 mt-2">
          <TaskTable
            filters={filters}
            userRole={userRole}
            userId={user?.id || ""}
            visibleColumns={preferences.visibleColumns}
            canCreateTasks={canCreateTasks}
            onCreateTask={() => setDialogOpen(true)}
            preferences={preferences}
            onPreferencesChange={setPreferences}
            onResetPreferences={handleResetPreferences}
            columnWidths={columnWidths}
            onColumnWidthsChange={handleColumnWidthsChange}
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
