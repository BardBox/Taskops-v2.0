import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";

interface MainLayoutProps {
  children: ReactNode;
  showRoleBadge?: boolean;
}

export function MainLayout({ children, showRoleBadge = true }: MainLayoutProps) {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        fetchUserData(session.user.id);
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
    await fetchUserData(session.user.id);
    setLoading(false);
  };

  const fetchUserData = async (userId: string) => {
    // Fetch role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData) {
      console.log("AppHeader: Fetched user role:", roleData.role);
      setUserRole(roleData.role);
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .single();

    if (profileData) {
      setUserName(profileData.full_name);
      setAvatarUrl(profileData.avatar_url || "");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        userRole={userRole}
        userName={userName}
        avatarUrl={avatarUrl}
        showRoleBadge={showRoleBadge}
      />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
