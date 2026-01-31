import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock3, Coffee, Zap, ZapOff, User } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

import { useTimeTracking } from "@/contexts/TimeTrackingContext";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const { state } = useTimeTracking();
  const { isFocusMode, toggleFocusMode } = useFocusMode();

  // Calculate display time for header (simple version of TimeBar logic)
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [breakTime, setBreakTime] = useState("00:00:00");

  // Get first name
  const firstName = userName?.split(' ')[0] || 'User';
  const initials = userName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

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

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    fetchUserId();
  }, []);

  return (
    <header className={cn(
      "sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 transition-all duration-300",
      isCompact || isFocusMode ? "h-10 text-sm shadow-md" : "h-14",
      isFocusMode ? "px-2" : "px-4"
    )}>
      {/* Left Section: User Avatar & Name */}
      <motion.div
        className="flex items-center gap-3 min-w-[140px]"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/profile')}
        >
          <Avatar className={cn(
            "ring-2 ring-primary/20 ring-offset-1 ring-offset-background transition-all shadow-sm",
            isFocusMode ? "h-7 w-7" : "h-9 w-9"
          )}>
            <AvatarImage src={avatarUrl} alt={userName} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-white font-semibold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "hidden sm:flex flex-col transition-all",
            isFocusMode && "hidden"
          )}>
            <span className="text-sm font-bold text-foreground leading-tight">{userName || 'User'}</span>
            {showRoleBadge && userRole && (
              <span className="text-[10px] text-muted-foreground capitalize leading-tight">{userRole}</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Center Section: Branding */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
        {/* Branding */}
        <div className={cn(
          "flex items-center gap-2 transition-all duration-300",
          (isCompact || isFocusMode) ? "scale-90" : "scale-100"
        )}>
          <img
            src="/bardbox-logo.png"
            alt="BardBox"
            className={cn("w-auto object-contain drop-shadow-sm dark:invert", isFocusMode ? "h-5" : "h-6")}
          />
          <h1 className={cn("font-bold tracking-tight transition-colors flex items-center gap-1", (isCompact || isFocusMode) ? "text-sm" : "text-base")}>
            TaskOPS 2.0<sup className="text-[8px] text-primary">™</sup>
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
        {/* Focus Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFocusMode}
          title={isFocusMode ? "Exit Focus Mode (F)" : "Enter Focus Mode (F)"}
          className={cn("transition-all", isFocusMode ? "h-8 w-8 text-primary" : "h-9 w-9 text-muted-foreground hover:text-primary")}
        >
          {isFocusMode ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
        </Button>

        {/* Compact Time Stats (Fade in when compact) */}
        <div className={cn(
          "flex items-center gap-3 overflow-hidden transition-all duration-300 border-r pr-4 border-border/50",
          (isCompact || isFocusMode) ? "w-auto opacity-100 translate-y-0" : "w-0 opacity-0 translate-y-2 pointer-events-none"
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

