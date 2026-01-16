import { useEffect, useState, useRef, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { TimeBar } from "@/components/layout/TimeBar";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";

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
      // console.log("AppHeader: Fetched user role:", roleData.role);
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

  // ... inside component
  const [isCompact, setIsCompact] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        const currentScrollTop = mainRef.current.scrollTop;

        // Always expand at the very top
        if (currentScrollTop < 20) {
          setIsCompact(false);
        }
        // Scroll Down -> Compact
        else if (currentScrollTop > lastScrollTop.current) {
          setIsCompact(true);
        }
        // Scroll Up -> Expand
        else if (currentScrollTop < lastScrollTop.current - 5) { // Small threshold to prevent jitter
          setIsCompact(false);
        }

        lastScrollTop.current = currentScrollTop;
      }
    };

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (mainElement) {
        mainElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden flex bg-background">
      {/* Sidebar Navigation */}
      <Sidebar userRole={userRole} className="flex-shrink-0 sticky top-0 h-screen" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <AppHeader
          userRole={userRole}
          userName={userName}
          avatarUrl={avatarUrl}
          showRoleBadge={showRoleBadge}
          isCompact={isCompact}
        />

        {/* TimeBar Container - Slides in/out based on compact mode */}
        <div className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isCompact ? "max-h-0 opacity-0 -translate-y-full" : "max-h-20 opacity-100 translate-y-0"
        )}>
          <TimeBar />
        </div>

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
