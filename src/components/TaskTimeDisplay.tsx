
import React from "react";
import { TimerPieChart } from "./TimerPieChart";
import { formatTimeTrackingFull, formatTimeTracking, useTaskTimeTracking } from "@/hooks/useTaskTimeTracking";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskTimeDisplayProps {
    taskId: string;
    className?: string;
    showLabel?: boolean;
    budgetSeconds?: number;
}

export const TaskTimeDisplay = ({ taskId, className, showLabel = true, budgetSeconds = 3600 }: TaskTimeDisplayProps) => {
    const { getTotalTime, isAnyoneTracking } = useTaskTimeTracking({ taskId });

    const totalSeconds = getTotalTime();
    const isRunning = isAnyoneTracking();

    // TODO: Fetch actual budget from task/project if available. 
    // For now using 2 hours (7200s) as a visual standard or 0 to show just presence.


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
