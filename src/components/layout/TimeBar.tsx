
import { useTimeTracking } from "@/contexts/TimeTrackingContext";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Clock, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function TimeBar() {
    const { state, clockIn, clockOut, pauseWork, resumeWork, isLoading } = useTimeTracking();
    const { isFocusMode } = useFocusMode();
    const [elapsedTime, setElapsedTime] = useState("00:00:00");
    const [breakTime, setBreakTime] = useState("00:00:00");

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const updateTimer = () => {
            const now = Date.now();

            // --- 1. Calculate Main Work Timer (Daily Total) ---
            let totalActiveDuration = 0;
            let currentSessionBreak = 0;

            if (state.clockInTime && (state.status === 'active' || state.status === 'break')) {
                const start = new Date(state.clockInTime).getTime();

                // Calculate total break duration so far in THIS session
                let totalBreak = state.totalBreakSeconds * 1000;

                // If currently on break, add the CURRENT break duration
                if (state.status === 'break' && state.lastBreakStart) {
                    const currentBreakDuration = now - new Date(state.lastBreakStart).getTime();
                    totalBreak += currentBreakDuration;
                    currentSessionBreak = totalBreak;
                } else {
                    currentSessionBreak = totalBreak;
                }

                totalActiveDuration = Math.max(0, now - start - totalBreak);
            }

            // Total Work = Active Session Work + Previous Sessions Work
            const totalDailyWork = totalActiveDuration + (state.previousSessionsTotal || 0) * 1000;
            setElapsedTime(formatMs(totalDailyWork));

            // --- 2. Calculate Break Timer (Daily Total) ---
            // Total Break = Current Session Break + Previous Sessions Breaks
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

    if (isLoading || isFocusMode) return null;

    // Determine Status Visuals
    const isOffline = state.status === 'idle' || state.status === 'completed';
    const isWorking = state.status === 'active';
    const isBreak = state.status === 'break';

    return (
        <div className={cn(
            "flex items-center justify-center border-b border-border/40 backdrop-blur-sm bg-background/80 px-4 py-2 gap-6 shadow-sm shadow-black/5 transition-all duration-300",
            isOffline && "bg-muted/20 border-border/20",
            isWorking && "bg-green-500/5 border-green-500/10",
            isBreak && "bg-orange-500/5 border-orange-500/10"
        )}>

            {/* Timers Display */}
            <div className="flex items-center gap-6">
                {/* Main Work Timer */}
                <div className={cn(
                    "flex items-center gap-2 font-mono text-sm font-medium tracking-tight transition-colors",
                    isWorking ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
                    isBreak && "opacity-50" // Dim work timer when on break
                )}>
                    <Clock className="h-3.5 w-3.5 opacity-70" />
                    <span className="text-base">{elapsedTime}</span>
                </div>

                {/* Vertical Divider */}
                <div className="h-4 w-px bg-border/40" />

                {/* Break Timer (Always visible) */}
                <div className={cn(
                    "flex items-center gap-2 font-mono text-sm font-medium tracking-tight transition-colors",
                    isBreak ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground/60"
                )}>
                    <Coffee className="h-3.5 w-3.5 opacity-70" />
                    <span>{breakTime}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
                {isOffline ? (
                    <Button
                        size="sm"
                        className="h-8 rounded-full px-5 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm font-medium transition-all hover:shadow-green-500/20"
                        onClick={clockIn}
                    >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Start Day
                    </Button>
                ) : (
                    <>
                        {isWorking ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-full px-5 gap-2 border-orange-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 dark:border-orange-900/30 dark:hover:bg-orange-950/30 transition-all text-muted-foreground"
                                onClick={pauseWork}
                            >
                                <Coffee className="h-3.5 w-3.5" />
                                Take Break
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-full px-5 gap-2 border-green-200 hover:bg-green-50 hover:text-green-600 hover:border-green-300 dark:border-green-900/30 dark:hover:bg-green-950/30 transition-all font-medium text-foreground"
                                onClick={resumeWork}
                            >
                                <Play className="h-3.5 w-3.5 fill-current" />
                                Resume
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-full px-4 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={clockOut}
                        >
                            <Square className="h-3.5 w-3.5 fill-current" />
                            Finish
                        </Button>
                    </>
                )}
            </div>

            {/* Minimal Status Indicators */}
            {isBreak && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-xs font-medium animate-in fade-in zoom-in-95 duration-200">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    On Break
                </div>
            )}
            {isWorking && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100/50 dark:bg-green-950/30 text-green-600 dark:text-green-400 text-xs font-medium animate-in fade-in zoom-in-95 duration-200">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Working
                </div>
            )}
        </div>
    );
}
