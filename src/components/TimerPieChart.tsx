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
    // Calculate percentage
    const percentage = Math.min((totalSeconds / budgetSeconds) * 100, 100);
    const isOverBudget = totalSeconds > budgetSeconds;

    // SVG Config
    const center = size / 2;
    const strokeWidth = 4; // Thicker for donut look
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate stroke dash offset
    // If over budget, we show a full red ring (or special effect), 
    // but for "Under Budget" we show partial green.
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className={cn("relative inline-flex items-center justify-center select-none", className)} style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className={cn("transform -rotate-90 transition-all duration-1000", isRunning ? "animate-pulse-subtle" : "")}
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

                {/* Progress Ring */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={cn(
                        "transition-all duration-500 ease-in-out",
                        isOverBudget ? "text-red-500" : (isRunning ? "text-blue-500" : "text-green-500")
                    )}
                />
            </svg>
            {text && (
                <div className={cn(
                    "absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums",
                    isOverBudget ? "text-red-500" : "text-foreground"
                )}>
                    {text}
                </div>
            )}
        </div>
    );
};
