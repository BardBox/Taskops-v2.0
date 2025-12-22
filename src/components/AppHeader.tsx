import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Sliders, Home, Shield, User, Menu, BarChart3, Bell, Users, Info, Hexagon, Activity, Smile, BellOff, DoorOpen, Plane, Clock3, CheckCircle2, Trophy, TrendingUp, Target } from "lucide-react";
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

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "Available":
        return Activity;
      case "Busy":
        return Clock3;
      case "Out of Office":
        return DoorOpen;
      case "Do Not Disturb":
        return BellOff;
      case "On Leave":
        return Plane;
      default:
        return Activity;
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
    <header className="sticky top-0 z-50 h-14 border-b border-border/50 bg-gradient-to-r from-background via-background to-background shadow-sm flex items-center justify-between px-2 sm:px-4">
      {/* Left Section: User Profile, Status & Mood icons */}
      <motion.div
        className="flex items-center gap-3 flex-shrink-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* User Profile - clickable to open profile */}
        <motion.div
          className="hidden md:flex items-center gap-3 pr-4 border-r border-border/30 cursor-pointer group"
          onClick={() => navigate("/profile")}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <div className="relative">
            <Avatar className="h-11 w-11 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
              <AvatarImage src={avatarUrl} alt={userName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${getStatusDotColor(status)}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">{userName || "User"}</span>
            {userRole && (
              <span className="text-[10px] text-muted-foreground capitalize font-medium">
                {userRole.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </motion.div>

        {/* Status Selector */}
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 gap-1.5">
              {(() => {
                const StatusIcon = getStatusIcon(status);
                return (
                  <StatusIcon
                    className={`h-4 w-4 ${status === "Available" ? "text-green-500" :
                      status === "Busy" ? "text-red-500" :
                        status === "Out of Office" ? "text-orange-500" :
                          status === "Do Not Disturb" ? "text-purple-500" :
                            status === "On Leave" ? "text-gray-500" :
                              "text-muted-foreground"
                      }`}
                  />
                );
              })()}
              <span className="text-xs text-muted-foreground hidden sm:inline">{status || "Status"}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 bg-background border shadow-lg z-[60]" align="start">
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
            <Button variant="ghost" className="h-8 px-2 gap-1.5">
              {mood ? <span className="text-base">{mood.split(" ")[0]}</span> : <Smile className="h-4 w-4" />}
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {mood ? mood.split(" ")[1] || "" : "Mood"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 bg-background border shadow-lg z-[60]" align="start">
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
      </motion.div>

      {/* Center Section: Logo */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 cursor-pointer group"
        onClick={() => navigate("/dashboard")}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        whileHover={{ scale: 1.03 }}
      >
        <motion.div
          className="relative"
          whileHover={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.5 }}
        >
          <img
            src="/bardbox-logo.png"
            alt="BardBox"
            className="h-8 sm:h-9 w-auto object-contain drop-shadow-sm"
          />
        </motion.div>
        <div className="flex flex-col items-start">
          <h1 className="text-sm sm:text-base font-bold whitespace-nowrap tracking-tight group-hover:text-primary transition-colors">
            TaskOPS<sup className="text-[8px] sm:text-[10px] text-primary">™</sup>
          </h1>
          {showRoleBadge && userRole && (
            <div className="hidden sm:block -mt-0.5">
              <RoleBadge role={userRole as "project_owner" | "project_manager" | "team_member"} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Right Section: Notifications & Burger Menu */}
      <motion.div
        className="flex items-center gap-2 flex-shrink-0"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      >

        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {userId && <NotificationCenter userId={userId} />}
        </motion.div>

        <Sheet>
          <SheetTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button variant="ghost" size="sm" className="relative">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary">
                  <Menu className="h-6 w-6 text-secondary" strokeWidth={3} />
                </div>
              </Button>
            </motion.div>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[300px]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>

            {/* User Profile Section */}
            <div className="flex items-center gap-3 py-4 border-b mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{userName || "User"}</span>
                {userRole && (
                  <RoleBadge role={userRole as "project_owner" | "project_manager" | "team_member"} />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                className={`justify-start ${location.pathname === "/dashboard" && !location.search.includes("view=growth")
                  ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                  : ""
                  }`}
                onClick={() => navigate("/dashboard")}
                // Hide Dashboard (Ops Center) for Sales Team
                style={{ display: userRole === "sales_team" ? "none" : "flex" }}
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              {/* ... other links ... */}
              {/* Note: I am replacing the chunk containing Dashboard button down to Growth Engine button to ensure context */}
              <Button
                variant="ghost"
                className={`justify-start ${location.pathname === "/profile"
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
                className={`justify-start ${location.pathname === "/team"
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
                className={`justify-start ${location.pathname === "/hive"
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
                className={`justify-start ${location.pathname.startsWith("/analytics")
                  ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                  : ""
                  }`}
                onClick={() => navigate("/analytics")}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Performance Analytics
              </Button>
              <Button
                variant="ghost"
                className={`justify-start ${location.pathname === "/posting-status"
                  ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                  : ""
                  }`}
                onClick={() => navigate("/posting-status")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Posting Status
              </Button>
              <Button
                variant="ghost"
                className={`justify-start ${location.pathname === "/preferences"
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
                className={`justify-start ${location.pathname === "/about"
                  ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                  : ""
                  }`}
                onClick={() => navigate("/about")}
              >
                <Info className="mr-2 h-4 w-4" />
                About
              </Button>
              {/* Admin Access for new roles logic if needed, but keeping existing check for now */}
              {hasAdminAccess && (
                <>
                  <div className="border-t my-2" />
                  <Button
                    variant="ghost"
                    className={`justify-start ${location.pathname.startsWith("/admin")
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
              {/* Growth Engine Logic */}
              {(userRole === "project_owner" || userRole === "business_head" || userRole === "sales_team") && (
                <Button
                  variant="ghost"
                  className={`justify-start ${location.search.includes("view=growth")
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                    : ""
                    }`}
                  onClick={() => navigate("/dashboard?view=growth")}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Growth Engine
                </Button>
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
