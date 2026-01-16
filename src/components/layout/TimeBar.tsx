
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
            "relative flex items-center justify-between border-b backdrop-blur-md bg-transparent px-8 py-3 transition-all duration-500 ease-out",
            // Glass morphism effect
            "before:absolute before:inset-0 before:backdrop-blur-xl before:-z-10",
            // Layered shadows for depth
            "shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
            // State-based styling
            isOffline && "bg-background/80 border-border/30",
            isWorking && "bg-emerald-50/20 dark:bg-emerald-900/5 border-emerald-100/30 dark:border-emerald-900/20",
            isBreak && "bg-orange-50/20 dark:bg-orange-900/5 border-orange-100/30 dark:border-orange-900/20"
        )}>

            {/* Left Section: Status Indicators */}
            <div className="flex items-center w-[220px]">
                {isBreak && (
                    <div className="group flex items-center gap-2.5 px-4 py-2 rounded-full bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 text-sm font-semibold tracking-wide border border-orange-200/30 dark:border-orange-800/20 animate-in fade-in slide-in-from-left-3 duration-500">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                        </span>
                        <span>On Break</span>
                    </div>
                )}
                {isWorking && (
                    <div className="group flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold tracking-wide border border-emerald-200/30 dark:border-emerald-800/20 animate-in fade-in slide-in-from-left-3 duration-500">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span>Working Now</span>
                    </div>
                )}
                {isOffline && (
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-muted/30 text-muted-foreground/80 text-sm font-semibold tracking-wide border border-border/40">
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30"></span>
                        <span>Offline</span>
                    </div>
                )}
            </div>

            {/* Center Section: Timers Display */}
            <div className="flex items-center gap-6 justify-center flex-1">
                {/* Main Work Timer (Bold & Prominent) */}
                <div className={cn(
                    "flex items-center gap-3.5 px-5 py-2.5 rounded-2xl transition-all duration-500 ease-out",
                    isWorking && "bg-emerald-50/30 dark:bg-emerald-900/10"
                )}>
                    <Clock className={cn(
                        "h-6 w-6 transition-all duration-500",
                        isWorking ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60"
                    )} strokeWidth={2.5} />
                    <div className="flex flex-col items-start">
                        <span className={cn(
                            "text-3xl font-bold tracking-tight tabular-nums transition-all duration-500",
                            isWorking ? "text-emerald-700 dark:text-emerald-300" : "text-foreground/90"
                        )}>{elapsedTime}</span>
                        <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/60 -mt-1">Working Hours</span>
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="h-10 w-px bg-border/20 mx-1" />

                {/* Break Timer (Subtle, Next to Working Hours) */}
                <div className={cn(
                    "flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all duration-500 ease-out",
                    isBreak && "bg-orange-50/30 dark:bg-orange-900/10"
                )}>
                    <Coffee className={cn(
                        "h-5 w-5 transition-all duration-500",
                        isBreak ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground/50"
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
                        variant="secondary"
                        size="sm"
                        className="h-10 rounded-full px-7 gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-semibold transition-all duration-300"
                        onClick={clockIn}
                    >
                        <Play className="h-4 w-4 fill-current" />
                        <span>Start Day</span>
                    </Button>
                ) : (
                    <>
                        {isWorking ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 rounded-full px-5 gap-2 text-muted-foreground/60 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all duration-300 border border-transparent hover:border-orange-200/40"
                                onClick={pauseWork}
                                title="Take a short break"
                            >
                                <Coffee className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only sm:inline-block font-medium">Break</span>
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 rounded-full px-5 gap-2 text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-300 border border-transparent hover:border-emerald-200/40"
                                onClick={resumeWork}
                            >
                                <Play className="h-4 w-4 fill-current" />
                                <span className="font-medium">Resume</span>
                            </Button>
                        )}

                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 rounded-full px-6 gap-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 font-semibold transition-all duration-300"
                            onClick={clockOut}
                        >
                            <Square className="h-3.5 w-3.5 fill-current" />
                            <span>End Day</span>
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
