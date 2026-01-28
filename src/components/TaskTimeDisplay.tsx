import React, { useState, useEffect } from "react";
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
    // Add override props
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
    // Only fetch if overrides are not provided (or we want to fetch anyway for other details, but let's prefer overrides)
    const { getTotalTime, isAnyoneTracking } = useTaskTimeTracking({ taskId, userId });

    const totalSeconds = overrideTotalSeconds !== undefined ? overrideTotalSeconds : getTotalTime();
    const isRunning = overrideIsRunning !== undefined ? overrideIsRunning : isAnyoneTracking();

    // Force re-render every second if running to show live ticking time
    const [_, setTick] = useState(0);
    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, [isRunning]);

    const formattedTime = formatTimeTrackingFull(totalSeconds, isRunning);
    // Short format for inside the donut (e.g. 1:30)
    const shortFormat = formatTimeTracking(totalSeconds, isRunning);

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("flex items-center gap-2", className)}>
                        <TimerPieChart
                            totalSeconds={totalSeconds}
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
