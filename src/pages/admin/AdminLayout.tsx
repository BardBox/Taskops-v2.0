import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (!roleData) {
        toast.error("No role assigned");
        navigate("/dashboard");
        return;
      }

      // Only owners and PMs can access admin panel
      const role = roleData.role as string;
      if (role !== "project_owner" && role !== "project_manager") {
        toast.error("Access denied");
        navigate("/dashboard");
        return;
      }

      setUserRole(roleData.role);

      // Get user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setUserName(profileData.full_name);
        setAvatarUrl(profileData.avatar_url || "");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar userRole={userRole} />

        <div className="flex-1 flex flex-col">
          <div className="sticky top-0 z-50 flex items-center border-b bg-background shadow-sm">
            <div className="flex items-center px-4 h-14">
              <SidebarTrigger />
              <span className="ml-2 text-sm text-muted-foreground">Admin</span>
            </div>
            <div className="flex-1">
              <AppHeader
                userRole={userRole || undefined}
                userName={userName}
                avatarUrl={avatarUrl}
                showRoleBadge={false}
              />
            </div>
          </div>

          <main className="flex-1 p-6 overflow-auto">
            <Outlet context={{ userRole }} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
