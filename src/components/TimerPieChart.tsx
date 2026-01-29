import React from "react";
import { cn } from "@/lib/utils";

interface TimerPieChartProps {
    totalSeconds: number;
    budgetSeconds?: number; // Optional budget
    isRunning?: boolean;
    className?: string;
    size?: number;
    text?: string;
}

export const TimerPieChart = ({
    totalSeconds,
    budgetSeconds = 3600, // Default 1 hour for visualization if not provided
    isRunning = false,
    className,
    size = 40,
    text
}: TimerPieChartProps) => {
    // SVG Config
    const center = size / 2;
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const isOverBudget = totalSeconds > budgetSeconds;

    // Calculate progress for normal time (0-100% of budget = 0-100% green fill)
    const normalPercentage = Math.min((totalSeconds / budgetSeconds) * 100, 100);

    // Calculate overtime red fill percentage
    // Red starts at 0% when time = budget (1x)
    // Red reaches 100% when time = 2x budget
    // Formula: overtime ratio from 0 to 1, mapped to 0-100%
    let overtimeRedPercentage = 0;
    if (isOverBudget) {
        // How much over budget (in terms of budget units)
        // At 1x budget: overtimeRatio = 0
        // At 1.5x budget: overtimeRatio = 0.5 -> 50% red
        // At 2x budget: overtimeRatio = 1 -> 100% red
        const overtimeRatio = (totalSeconds - budgetSeconds) / budgetSeconds;
        overtimeRedPercentage = Math.min(overtimeRatio * 100, 100);
    }

    // Calculate stroke dash offsets
    // For green ring: shows progress from 0 to budget (or full if over budget)
    const greenOffset = circumference - (normalPercentage / 100) * circumference;

    // For red overtime ring: shows how much over budget
    const redOffset = circumference - (overtimeRedPercentage / 100) * circumference;

    return (
        <div className={cn("relative inline-flex items-center justify-center select-none", className)} style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90 transition-all duration-1000"
            >
                {/* Background Ring (Gray) */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-slate-200 dark:text-slate-800"
                />

                {/* Green Progress Ring - shows time used within budget */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={greenOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-in-out text-green-500"
                />

                {/* Red Overtime Ring - gradually fills as time exceeds budget */}
                {isOverBudget && (
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={redOffset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-in-out text-red-500"
                    />
                )}
            </svg>
            {text && (
                <div className={cn(
                    "absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums",
                    isRunning
                        ? "text-blue-500 animate-pulse"
                        : isOverBudget
                            ? "text-red-500"
                            : "text-muted-foreground"
                )}>
                    {text}
                </div>
            )}
        </div>
    );
};
