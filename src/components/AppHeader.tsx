import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Sliders, Home, Shield, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { RoleBadge } from "@/components/RoleBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AppHeaderProps {
  userRole?: string;
  userName?: string;
  avatarUrl?: string;
  showRoleBadge?: boolean;
}

export function AppHeader({ userRole, userName, avatarUrl, showRoleBadge = true }: AppHeaderProps) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    fetchUserId();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const hasAdminAccess = userRole === "project_owner" || userRole === "project_manager";
  const initials = userName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 h-14 border-b bg-background shadow-sm flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <img 
          src="/bardbox-logo.png" 
          alt="BardBox" 
          className="h-8 w-auto object-contain cursor-pointer"
          onClick={() => navigate("/dashboard")}
        />
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold">
            TaskOPS<sup className="text-xs">™</sup>
          </h1>
          {showRoleBadge && userRole && <RoleBadge role={userRole as "project_owner" | "project_manager" | "team_member"} />}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {userId && <NotificationCenter userId={userId} />}
        
        <div className="hidden md:flex flex-col items-end">
          <span className="text-sm font-medium">{userName}</span>
          {userRole && (
            <span className="text-xs text-muted-foreground capitalize">
              {userRole.replace(/_/g, " ")}
            </span>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                {userRole && (
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {userRole.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/dashboard")}>
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/analytics")}>
              <Shield className="mr-2 h-4 w-4" />
              Performance Metrics
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/account-settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/preferences")}>
              <Sliders className="mr-2 h-4 w-4" />
              Preferences
            </DropdownMenuItem>
            {hasAdminAccess && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin")}>
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Panel
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
