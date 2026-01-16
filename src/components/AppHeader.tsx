import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, Smile, Clock3, DoorOpen, BellOff, Plane, Coffee } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationCenter } from "@/components/NotificationCenter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { useTimeTracking } from "@/contexts/TimeTrackingContext";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  userRole?: string;
  userName?: string;
  avatarUrl?: string;
  showRoleBadge?: boolean;
  isCompact?: boolean;
}

export function AppHeader({ userRole, userName, avatarUrl, showRoleBadge = true, isCompact = false }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useTimeTracking(); // Get time tracking state

  // Calculate display time for header (simple version of TimeBar logic)
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [breakTime, setBreakTime] = useState("00:00:00");

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateTimer = () => {
      const now = Date.now();
      let totalActiveDuration = 0;
      let currentSessionBreak = 0;

      if (state.clockInTime && (state.status === 'active' || state.status === 'break')) {
        const start = new Date(state.clockInTime).getTime();
        let totalBreak = state.totalBreakSeconds * 1000;

        if (state.status === 'break' && state.lastBreakStart) {
          const currentBreakDuration = now - new Date(state.lastBreakStart).getTime();
          totalBreak += currentBreakDuration;
          currentSessionBreak = totalBreak;
        } else {
          currentSessionBreak = totalBreak;
        }
        totalActiveDuration = Math.max(0, now - start - totalBreak);
      }
      const totalDailyWork = totalActiveDuration + (state.previousSessionsTotal || 0) * 1000;
      setElapsedTime(formatMs(totalDailyWork));

      const totalDailyBreak = currentSessionBreak + (state.previousBreaksTotal || 0) * 1000;
      setBreakTime(formatMs(totalDailyBreak));
    };

    const formatMs = (ms: number) => {
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    updateTimer();
    interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [state.clockInTime, state.status, state.totalBreakSeconds, state.lastBreakStart, state.previousSessionsTotal, state.previousBreaksTotal]);

  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<string[]>([
    "Available", "Busy", "Out of Office", "Do Not Disturb", "On Leave"
  ]);
  const [moods, setMoods] = useState<string[]>([
    "😄 Happy", "😎 Cool", "🤔 Thoughtful", "😴 Tired", "🔥 On Fire",
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
        let value = setting.setting_value;
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            console.error("Failed to parse setting:", setting.setting_key, e);
          }
        }

        if (setting.setting_key === "status_options" && Array.isArray(value)) {
          setStatuses(value);
        } else if (setting.setting_key === "mood_options" && Array.isArray(value)) {
          setMoods(value);
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

  return (
    <header className={cn(
      "sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 transition-all duration-300",
      isCompact ? "h-10 text-sm shadow-md" : "h-14"
    )}>
      {/* Left Section: Status & Mood icons */}
      <motion.div
        className="flex items-center gap-3 flex-shrink-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Status Selector */}
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2 border-dashed transition-all", isCompact ? "h-7 px-2 text-xs" : "h-8")}>
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
              <span className="font-medium hidden sm:inline">{status || "Set Status"}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
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
            <Button variant="ghost" size="sm" className={cn("p-0 sm:w-auto sm:px-2 sm:gap-2 transition-all", isCompact ? "h-7 w-7 text-xs" : "h-8 w-8")}>
              {mood ? <span className={isCompact ? "text-sm" : "text-base"}>{mood.split(" ")[0]}</span> : <Smile className="h-4 w-4 text-muted-foreground" />}
              <span className="text-muted-foreground hidden sm:inline">
                {mood ? mood.split(" ")[1] || "" : "Mood"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="grid grid-cols-2 gap-1">
              {moods.map((m) => (
                <Button
                  key={m}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-sm h-auto py-2 px-2"
                  onClick={() => updateMood(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </motion.div>

      {/* Center Section: Branding */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
        {/* Branding */}
        <div className={cn(
          "flex items-center gap-2 transition-all duration-300",
          isCompact ? "scale-90" : "scale-100"
        )}>
          <img
            src="/bardbox-logo.png"
            alt="BardBox"
            className="h-6 w-auto object-contain drop-shadow-sm"
          />
          <h1 className={cn("font-bold tracking-tight transition-colors flex items-center gap-1", isCompact ? "text-sm" : "text-base")}>
            TaskOPS<sup className="text-[8px] text-primary">™</sup>
          </h1>
        </div>
      </div>

      {/* Right Section: Time Stats & Notifications */}
      <motion.div
        className="flex items-center gap-4 flex-shrink-0"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      >
        {/* Compact Time Stats (Fade in when compact) */}
        <div className={cn(
          "flex items-center gap-3 overflow-hidden transition-all duration-300 border-r pr-4 border-border/50",
          isCompact ? "w-auto opacity-100 translate-y-0" : "w-0 opacity-0 translate-y-2 pointer-events-none"
        )}>
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <Clock3 className="h-3 w-3" />
            <span className={state.status === 'active' ? "text-green-600 font-semibold" : ""}>{elapsedTime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground opacity-70">
            <Coffee className="h-3 w-3" />
            <span>{breakTime}</span>
          </div>
        </div>

        {userId && <NotificationCenter userId={userId} />}
      </motion.div>
    </header>
  );
}
