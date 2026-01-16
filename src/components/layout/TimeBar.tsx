
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
            "relative flex items-center justify-between border-b backdrop-blur-md bg-gradient-to-r px-8 py-3 transition-all duration-500 ease-out",
            // Glass morphism effect
            "before:absolute before:inset-0 before:backdrop-blur-xl before:-z-10",
            // Layered shadows for depth
            "shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]",
            // State-based styling
            isOffline && "from-background/95 via-background/90 to-muted/30 border-border/30",
            isWorking && "from-green-50/80 via-background/95 to-green-50/60 dark:from-green-950/30 dark:via-background/95 dark:to-green-950/20 border-green-200/40 dark:border-green-800/30 shadow-green-500/10",
            isBreak && "from-orange-50/80 via-background/95 to-orange-50/60 dark:from-orange-950/30 dark:via-background/95 dark:to-orange-950/20 border-orange-200/40 dark:border-orange-800/30 shadow-orange-500/10"
        )}>

            {/* Left Section: Status Indicators */}
            <div className="flex items-center w-[220px]">
                {isBreak && (
                    <div className="group flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-950/50 dark:to-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-semibold tracking-wide shadow-lg shadow-orange-500/20 border border-orange-200/50 dark:border-orange-800/30 animate-in fade-in slide-in-from-left-3 duration-500">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-60"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-br from-orange-400 to-orange-600 shadow-inner"></span>
                        </span>
                        <span className="drop-shadow-sm">On Break</span>
                    </div>
                )}
                {isWorking && (
                    <div className="group flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-green-50 dark:from-green-950/50 dark:to-green-900/30 text-green-700 dark:text-green-300 text-sm font-semibold tracking-wide shadow-lg shadow-green-500/20 border border-green-200/50 dark:border-green-800/30 animate-in fade-in slide-in-from-left-3 duration-500">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-br from-green-400 to-green-600 shadow-inner"></span>
                        </span>
                        <span className="drop-shadow-sm">Working Now</span>
                    </div>
                )}
                {isOffline && (
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-muted/60 to-muted/40 text-muted-foreground/80 text-sm font-semibold tracking-wide shadow-md border border-border/40">
                        <span className="h-3 w-3 rounded-full bg-gradient-to-br from-muted-foreground/40 to-muted-foreground/20 shadow-inner"></span>
                        <span>Offline</span>
                    </div>
                )}
            </div>

            {/* Center Section: Timers Display */}
            <div className="flex items-center gap-6 justify-center flex-1">
                {/* Main Work Timer (Bold & Prominent) */}
                <div className={cn(
                    "flex items-center gap-3.5 px-5 py-2.5 rounded-2xl transition-all duration-500 ease-out",
                    isWorking && "bg-green-50/50 dark:bg-green-950/20 shadow-lg shadow-green-500/10 scale-105",
                    isBreak && "opacity-50 grayscale scale-95"
                )}>
                    <Clock className={cn(
                        "h-6 w-6 transition-all duration-500",
                        isWorking ? "text-green-600 dark:text-green-400 drop-shadow-md" : "text-muted-foreground/60"
                    )} strokeWidth={2.5} />
                    <div className="flex flex-col items-start">
                        <span className={cn(
                            "text-3xl font-bold tracking-tight tabular-nums transition-all duration-500",
                            isWorking ? "text-green-700 dark:text-green-300 drop-shadow-sm" : "text-foreground/90"
                        )}>{elapsedTime}</span>
                        <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/60 -mt-1">Working Hours</span>
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="h-12 w-px bg-gradient-to-b from-transparent via-border/50 to-transparent" />

                {/* Break Timer (Subtle, Next to Working Hours) */}
                <div className={cn(
                    "flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all duration-500 ease-out",
                    isBreak && "bg-orange-50/50 dark:bg-orange-950/20 shadow-lg shadow-orange-500/10 scale-105"
                )}>
                    <Coffee className={cn(
                        "h-5 w-5 transition-all duration-500",
                        isBreak ? "text-orange-600 dark:text-orange-400 drop-shadow-md" : "text-muted-foreground/50"
                    )} />
                    <div className="flex flex-col items-start">
                        <span className={cn(
                            "text-xl font-semibold tabular-nums tracking-tight transition-all duration-500",
                            isBreak ? "text-orange-700 dark:text-orange-300" : "text-muted-foreground/70"
                        )}>{breakTime}</span>
                        <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/50 -mt-0.5">Break Time</span>
                    </div>
                </div>
            </div>

            {/* Right Section: Controls */}
            <div className="flex items-center gap-3 justify-end w-[220px]">
                {isOffline ? (
                    <Button
                        size="sm"
                        className="group h-10 rounded-full px-7 gap-2.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-xl shadow-green-500/30 font-semibold tracking-wide transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-green-500/40 active:scale-95 border border-green-400/20"
                        onClick={clockIn}
                    >
                        <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" />
                        <span className="drop-shadow-sm">Start Day</span>
                    </Button>
                ) : (
                    <>
                        {isWorking ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 rounded-full px-5 gap-2 text-muted-foreground/70 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 border border-transparent hover:border-orange-200/50 dark:hover:border-orange-800/30"
                                onClick={pauseWork}
                                title="Take a short break"
                            >
                                <Coffee className="h-4 w-4 transition-transform hover:scale-110" />
                                <span className="sr-only sm:not-sr-only sm:inline-block font-medium">Break</span>
                            </Button>
                        ) : (
                            <Button
                                variant="default"
                                size="sm"
                                className="group h-10 rounded-full px-7 gap-2.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-xl shadow-green-500/30 font-semibold transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-green-500/40 active:scale-95 border border-green-400/20"
                                onClick={resumeWork}
                            >
                                <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" />
                                <span className="drop-shadow-sm">Resume</span>
                            </Button>
                        )}

                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 rounded-full px-5 gap-2 text-muted-foreground/80 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-border/40 hover:border-red-200/50 dark:hover:border-red-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10 font-medium"
                            onClick={clockOut}
                        >
                            <Square className="h-4 w-4 fill-current" />
                            <span>Finish</span>
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
