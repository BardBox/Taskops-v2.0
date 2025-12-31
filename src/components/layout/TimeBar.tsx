
import { useTimeTracking } from "@/contexts/TimeTrackingContext";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Clock, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function TimeBar() {
    const { state, clockIn, clockOut, pauseWork, resumeWork, isLoading } = useTimeTracking();
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

    if (isLoading) return null;

    // Determine Status Visuals
    const isOffline = state.status === 'idle' || state.status === 'completed';
    const isWorking = state.status === 'active';
    const isBreak = state.status === 'break';

    return (
        <div className={cn(
            "flex items-center justify-center border-b px-4 py-1.5 gap-4 shadow-sm text-sm transition-colors duration-300",
            isOffline && "bg-muted/40",
            isWorking && "bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/50",
            isBreak && "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/50"
        )}>

            {/* Timers Display */}
            <div className="flex items-center gap-4">
                {/* Main Work Timer */}
                <div className={cn(
                    "flex items-center gap-2 font-mono text-lg font-medium tracking-tight transition-colors",
                    isWorking ? "text-green-700 dark:text-green-400" : "text-muted-foreground",
                    isBreak && "opacity-60" // Dim work timer when on break
                )}>
                    <Clock className="h-4 w-4" />
                    {elapsedTime}
                </div>

                {/* Break Timer (Always visible) */}
                <div className={cn(
                    "flex items-center gap-2 font-mono text-lg font-medium tracking-tight transition-colors",
                    isBreak ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground/70"
                )}>
                    <Coffee className="h-4 w-4" />
                    {breakTime}
                </div>
            </div>

            <div className="h-4 w-px bg-border/60 mx-2" />

            {/* Controls */}
            <div className="flex items-center gap-2">
                {isOffline ? (
                    <Button
                        size="sm"
                        className="h-7 gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-none"
                        onClick={clockIn}
                    >
                        <Play className="h-3.5 w-3.5" />
                        Clock In
                    </Button>
                ) : (
                    <>
                        {isWorking ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 gap-1.5 bg-background border shadow-sm hover:bg-muted/50 text-foreground"
                                onClick={pauseWork}
                            >
                                <Coffee className="h-3.5 w-3.5 text-orange-500" />
                                Pause Work
                            </Button>
                        ) : (
                            <Button
                                variant="default"
                                size="sm"
                                className="h-7 gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-none"
                                onClick={resumeWork}
                            >
                                <Play className="h-3.5 w-3.5" />
                                Resume Work
                            </Button>
                        )}

                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 gap-1.5 shadow-none opacity-80 hover:opacity-100"
                            onClick={clockOut}
                        >
                            <Square className="h-3.5 w-3.5 fill-current" />
                            Clock Out
                        </Button>
                    </>
                )}
            </div>

            {/* Status Badge */}
            {isBreak && (
                <span className="ml-2 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/40 px-2 py-0.5 rounded-full">
                    On Break
                </span>
            )}
            {isWorking && (
                <span className="ml-2 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/40 px-2 py-0.5 rounded-full">
                    Working
                </span>
            )}
            {isOffline && (
                <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Offline
                </span>
            )}
        </div>
    );
}
