import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";

interface TaskTimerProps {
    totalSecondsSnapshot: number;
    runningStartTimes: string[]; // Still passed but used as fallback/initial data
    taskStatus: string; // The current status of the task
    className?: string;
}

export function TaskTimer({
    totalSecondsSnapshot,
    runningStartTimes,
    taskStatus,
    className
}: TaskTimerProps) {
    const { state: timeTrackingState } = useTimeTracking();

    // Determine if time should be counting based ONLY on status
    const isGloballyWorking = timeTrackingState.status === 'active';
    const isTaskInProgress = taskStatus === "In Progress";
    const shouldCount = isGloballyWorking && isTaskInProgress;

    // Track accumulated time and when counting started
    const [accumulatedSeconds, setAccumulatedSeconds] = useState(totalSecondsSnapshot);
    const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0);
    const countingStartRef = useRef<number | null>(null);
    const prevShouldCountRef = useRef(shouldCount);

    // Sync with external snapshot when it changes
    useEffect(() => {
        setAccumulatedSeconds(totalSecondsSnapshot);
    }, [totalSecondsSnapshot]);

    // Handle transitions between counting and not counting
    useEffect(() => {
        const wasCountingBefore = prevShouldCountRef.current;

        if (shouldCount && !wasCountingBefore) {
            // Started counting - record start time
            countingStartRef.current = Date.now();
            setCurrentSessionSeconds(0);
        } else if (!shouldCount && wasCountingBefore) {
            // Stopped counting - accumulate the session time
            if (countingStartRef.current) {
                const elapsedSeconds = Math.floor((Date.now() - countingStartRef.current) / 1000);
                setAccumulatedSeconds(prev => prev + elapsedSeconds);
                setCurrentSessionSeconds(0);
                countingStartRef.current = null;
            }
        }

        prevShouldCountRef.current = shouldCount;
    }, [shouldCount]);

    // Live tick - only when counting
    useEffect(() => {
        if (!shouldCount || !countingStartRef.current) {
            return;
        }

        const tick = () => {
            if (countingStartRef.current) {
                const elapsed = Math.floor((Date.now() - countingStartRef.current) / 1000);
                setCurrentSessionSeconds(elapsed);
            }
        };

        // Immediate tick
        tick();

        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [shouldCount]);

    // Calculate display time
    const displaySeconds = accumulatedSeconds + currentSessionSeconds;

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className={cn("flex items-center", className)} onClick={(e) => e.stopPropagation()}>
            <div className={cn(
                "px-2 py-1 rounded-md font-mono text-xs font-medium transition-colors tabular-nums",
                shouldCount
                    ? "bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                    : isTaskInProgress && !isGloballyWorking
                        ? "bg-orange-50/50 text-orange-600/70 dark:bg-orange-950/20 dark:text-orange-400/70"
                        : "bg-muted/30 text-muted-foreground/70"
            )}>
                {formatTime(displaySeconds)}
            </div>
        </div>
    );
}
