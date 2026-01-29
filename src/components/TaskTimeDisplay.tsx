import React, { useState, useEffect, useRef } from "react";
import { TimerPieChart } from "./TimerPieChart";
import { formatTimeTrackingFull, formatTimeTracking, useTaskTimeTracking } from "@/hooks/useTaskTimeTracking";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskTimeDisplayProps {
    taskId: string;
    userId?: string;
    className?: string;
    showLabel?: boolean;
    budgetSeconds?: number;
    overrideTotalSeconds?: number;
    overrideIsRunning?: boolean;
}

export const TaskTimeDisplay = ({
    taskId,
    userId,
    className,
    showLabel = true,
    budgetSeconds = 3600,
    overrideTotalSeconds,
    overrideIsRunning
}: TaskTimeDisplayProps) => {
    // When override props are provided, skip the hook to avoid extra subscriptions
    const hasOverrides = overrideTotalSeconds !== undefined && overrideIsRunning !== undefined;

    // Only call the hook if we don't have override props
    const hookResult = useTaskTimeTracking({
        taskId: hasOverrides ? '' : taskId,
        userId
    });

    // Use override props if provided, otherwise fall back to hook values
    const baseSeconds = hasOverrides ? overrideTotalSeconds : hookResult.getTotalTime();
    const isRunning = hasOverrides ? overrideIsRunning : hookResult.isAnyoneTracking();

    // Refs for stable timer tracking
    const timerStartRef = useRef<number | null>(null);
    const baseSecondsAtStartRef = useRef<number>(0);
    const prevIsRunningRef = useRef<boolean>(false);
    const baseSecondsLatestRef = useRef(baseSeconds);

    // Keep baseSeconds ref updated
    useEffect(() => {
        baseSecondsLatestRef.current = baseSeconds;
    });

    // State for the displayed time
    const [displaySeconds, setDisplaySeconds] = useState(baseSeconds);

    // Update display when baseSeconds updates (e.g. data loaded) and not running
    useEffect(() => {
        if (!isRunning) {
            setDisplaySeconds(baseSeconds);
        }
    }, [baseSeconds, isRunning]);

    // Main timer effect - ONLY reacts to isRunning changes
    useEffect(() => {
        // Detect transition from not-running to running
        if (isRunning && !prevIsRunningRef.current) {
            timerStartRef.current = Date.now();
            baseSecondsAtStartRef.current = baseSecondsLatestRef.current;
        }

        // Detect transition from running to not-running
        if (!isRunning && prevIsRunningRef.current) {
            timerStartRef.current = null;
            setDisplaySeconds(baseSecondsLatestRef.current);
        }

        prevIsRunningRef.current = isRunning;

        if (!isRunning) {
            setDisplaySeconds(baseSecondsLatestRef.current);
            return;
        }

        // Running - set up the interval
        const calculateElapsed = () => {
            if (timerStartRef.current === null) {
                return baseSecondsLatestRef.current;
            }
            const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000);
            return baseSecondsAtStartRef.current + elapsed;
        };

        setDisplaySeconds(calculateElapsed());

        const interval = setInterval(() => {
            setDisplaySeconds(calculateElapsed());
        }, 1000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRunning, taskId]);

    const formattedTime = formatTimeTrackingFull(displaySeconds, isRunning);
    const shortFormat = formatTimeTracking(displaySeconds, isRunning);

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("flex items-center gap-2", className)}>
                        <TimerPieChart
                            totalSeconds={displaySeconds}
                            budgetSeconds={budgetSeconds}
                            isRunning={isRunning}
                            size={42}
                            text={shortFormat}
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Total Time: {formattedTime}</p>
                    {isRunning && <p className="text-green-500 text-xs">Tracking active</p>}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
