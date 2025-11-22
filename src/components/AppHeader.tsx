import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Sliders, Home, Shield, User, Menu, BarChart3, Bell, Users, Info, Hexagon, Activity, Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<string[]>([
    "Available", "Busy", "Out of Office", "Do Not Disturb", "On Leave"
  ]);
  const [moods, setMoods] = useState<string[]>([
    "😊 Happy", "😎 Cool", "🤔 Thoughtful", "😴 Tired", "🔥 On Fire",
    "🎯 Focused", "🎉 Excited", "😌 Relaxed", "💪 Motivated", "🤯 Overwhelmed"
  ]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        fetchUserProfile(session.user.id);
        fetchOptions();
      }
    };
    fetchUserId();
  }, []);

  const fetchUserProfile = async (id: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("status, mood")
      .eq("id", id)
      .single();
    
    if (data) {
      setStatus(data.status);
      setMood(data.mood);
    }
  };

  const fetchOptions = async () => {
    const { data: settings } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["status_options", "mood_options"]);

    if (settings) {
      settings.forEach((setting) => {
        if (setting.setting_key === "status_options") {
          setStatuses(JSON.parse(setting.setting_value));
        } else if (setting.setting_key === "mood_options") {
          setMoods(JSON.parse(setting.setting_value));
        }
      });
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", userId);

    if (!error) {
      setStatus(newStatus);
      setStatusOpen(false);
      toast.success(`Status updated to ${newStatus}`);
    }
  };

  const updateMood = async (newMood: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ mood: newMood })
      .eq("id", userId);

    if (!error) {
      setMood(newMood);
      setMoodOpen(false);
      toast.success("Mood updated");
    }
  };

  const getStatusDotColor = (status: string | null) => {
    if (!status) return "bg-gray-500";
    switch (status) {
      case "Available": return "bg-green-500";
      case "Busy": return "bg-red-500";
      case "Out of Office": return "bg-orange-500";
      case "Do Not Disturb": return "bg-purple-500";
      case "On Leave": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

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
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
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
      <div className="absolute left-1/2 -translate-x-1/2 transform">
        <motion.div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/dashboard")}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          whileHover={{ scale: 1.05 }}
        >
          <img
            src="/bardbox-logo.png"
            alt="BardBox"
            className="h-8 w-auto object-contain"
          />
          <h1 className="text-base font-semibold">
            TaskOPS<sup className="text-xs">™</sup>
          </h1>
          {showRoleBadge && userRole && (
            <RoleBadge role={userRole as "project_owner" | "project_manager" | "team_member"} />
          )}
        </motion.div>
      </div>

      {/* Right Section: Status/Mood, Notifications & Burger Menu */}
      <motion.div 
        className="flex items-center gap-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      >
        {/* Status Selector */}
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-9 px-2 gap-2 relative">
              <Activity className={`h-4 w-4 ${
                status === "Available" ? "text-green-500" :
                status === "Busy" ? "text-red-500" :
                status === "Out of Office" ? "text-orange-500" :
                status === "Do Not Disturb" ? "text-purple-500" :
                status === "On Leave" ? "text-gray-500" :
                "text-muted-foreground"
              }`} />
              <span className="text-xs text-muted-foreground/60 hidden md:block">{status || "Set Status"}</span>
              <div className={`absolute top-1 left-1 h-2 w-2 rounded-full ${getStatusDotColor(status)}`} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end">
            <div className="space-y-1">
              {statuses.map((s) => (
                <Button
                  key={s}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => updateStatus(s)}
                >
                  <div className={`h-2 w-2 rounded-full ${getStatusDotColor(s)}`} />
                  {s}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Mood Selector */}
        <Popover open={moodOpen} onOpenChange={setMoodOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-9 px-2 gap-2">
              {mood ? <span className="text-base">{mood.split(" ")[0]}</span> : <Smile className="h-4 w-4" />}
              <span className="text-xs text-muted-foreground/60 hidden md:block">
                {mood ? mood.split(" ")[1] || "Mood" : "Set Mood"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 bg-background border shadow-lg z-50" align="end">
            <div className="grid grid-cols-2 gap-1">
              {moods.map((m) => (
                <Button
                  key={m}
                  variant="ghost"
                  size="sm"
                  className="justify-center text-sm h-auto py-2.5 px-2 whitespace-nowrap"
                  onClick={() => updateMood(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <motion.div
            whileHover={{ 
              rotate: [0, -10, 10, -10, 10, 0],
            }}
            transition={{ duration: 0.5 }}
          >
            {userId && <NotificationCenter userId={userId} />}
          </motion.div>
        </motion.div>
        
        <Sheet>
          <SheetTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button variant="ghost" size="icon" className="relative">
                <Menu className="h-5 w-5" />
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
                className={`justify-start ${
                  location.pathname === "/dashboard" 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" 
                    : ""
                }`}
                onClick={() => navigate("/dashboard")}
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className={`justify-start ${
                  location.pathname === "/profile" 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" 
                    : ""
                }`}
                onClick={() => navigate("/profile")}
              >
                <User className="mr-2 h-4 w-4" />
                My Profile
              </Button>
              <Button
                variant="ghost"
                className={`justify-start ${
                  location.pathname === "/team" 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" 
                    : ""
                }`}
                onClick={() => navigate("/team")}
              >
                <Users className="mr-2 h-4 w-4" />
                My Team
              </Button>
              <Button
                variant="ghost"
                className={`justify-start ${
                  location.pathname === "/hive" 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" 
                    : ""
                }`}
                onClick={() => navigate("/hive")}
              >
                <Hexagon className="mr-2 h-4 w-4" />
                The Creative Hive
              </Button>
              <Button
                variant="ghost"
                className={`justify-start ${
                  location.pathname === "/analytics" 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" 
                    : ""
                }`}
                onClick={() => navigate("/analytics")}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Performance Metrics
              </Button>
              <Button
                variant="ghost"
                className={`justify-start ${
                  location.pathname === "/account-settings" 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" 
                    : ""
                }`}
                onClick={() => navigate("/account-settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </Button>
              <Button
                variant="ghost"
                className={`justify-start ${
                  location.pathname === "/preferences" 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" 
                    : ""
                }`}
                onClick={() => navigate("/preferences")}
              >
                <Sliders className="mr-2 h-4 w-4" />
                Preferences
              </Button>
              <Button
                variant="ghost"
                className={`justify-start ${
                  location.pathname === "/about" 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" 
                    : ""
                }`}
                onClick={() => navigate("/about")}
              >
                <Info className="mr-2 h-4 w-4" />
                About
              </Button>
              {hasAdminAccess && (
                <>
                  <div className="border-t my-2" />
                  <Button
                    variant="ghost"
                    className={`justify-start ${
                      location.pathname.startsWith("/admin") 
                        ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" 
                        : ""
                    }`}
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
      </motion.div>
    </header>
  );
}
