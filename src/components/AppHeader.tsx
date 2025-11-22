import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Sliders, Home, Shield, User, Menu, BarChart3, Bell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { RoleBadge } from "@/components/RoleBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
      {/* Left Section: Profile */}
      <motion.div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate("/profile")}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          whileHover={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Avatar className="h-9 w-9 ring-2 ring-primary/20 transition-all hover:ring-primary/40">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </motion.div>
        <div className="hidden md:flex flex-col">
          <span className="text-sm font-medium">{userName}</span>
          {userRole && (
            <span className="text-xs text-muted-foreground capitalize">
              {userRole.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </motion.div>

      {/* Center Section: Logo */}
      <motion.div 
        className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        <motion.img 
          src="/bardbox-logo.png" 
          alt="BardBox" 
          className="h-8 w-auto object-contain cursor-pointer"
          onClick={() => navigate("/dashboard")}
          whileHover={{ rotate: [0, -2, 2, -2, 0] }}
          transition={{ duration: 0.5 }}
        />
        <h1 className="text-base font-semibold cursor-pointer" onClick={() => navigate("/dashboard")}>
          TaskOPS<sup className="text-xs">™</sup>
        </h1>
        {showRoleBadge && userRole && <RoleBadge role={userRole as "project_owner" | "project_manager" | "team_member"} />}
      </motion.div>

      {/* Right Section: Notifications & Burger Menu */}
      <div className="flex items-center gap-3">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 15 }}
          transition={{ duration: 0.2 }}
        >
          {userId && <NotificationCenter userId={userId} />}
        </motion.div>
        
        <Sheet>
          <SheetTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Button variant="ghost" size="icon" className="relative">
                <motion.div
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.3 }}
                >
                  <Menu className="h-5 w-5" />
                </motion.div>
              </Button>
            </motion.div>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 mt-6">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => navigate("/profile")}
              >
                <User className="mr-2 h-4 w-4" />
                My Profile
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => navigate("/analytics")}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Performance Metrics
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => navigate("/account-settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => navigate("/preferences")}
              >
                <Sliders className="mr-2 h-4 w-4" />
                Preferences
              </Button>
              {hasAdminAccess && (
                <>
                  <div className="border-t my-2" />
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => navigate("/admin")}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </Button>
                </>
              )}
              <div className="border-t my-2" />
              <Button
                variant="ghost"
                className="justify-start text-destructive hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
