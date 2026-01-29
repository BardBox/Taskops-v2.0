import { cn } from "@/lib/utils";
import { formatTimeTrackingFull } from "@/hooks/useTaskTimeTracking";
import { Clock, TrendingUp, AlertCircle, CheckCircle2, Zap, Timer } from "lucide-react";

interface TimeBudgetIndicatorProps {
    totalSeconds: number;
    budgetSeconds: number;
    className?: string;
    isRunning?: boolean;
}

export function TimeBudgetIndicator({ totalSeconds, budgetSeconds, className, isRunning }: TimeBudgetIndicatorProps) {
    const hasBudget = budgetSeconds > 0;

    // Calculate percentage only if budget exists, else 0 or 100 for visual
    const percentage = hasBudget ? Math.min((totalSeconds / budgetSeconds) * 100, 100) : 0;
    const isOverBudget = hasBudget && totalSeconds > budgetSeconds;

    // Dynamic color selection
    let colorClass = "from-emerald-400 to-emerald-500 shadow-emerald-500/20";
    let textColorClass = "text-emerald-600 dark:text-emerald-400";

    if (hasBudget) {
        if (percentage > 70) {
            colorClass = "from-amber-400 to-amber-500 shadow-amber-500/20";
            textColorClass = "text-amber-600 dark:text-amber-400";
        }
        if (percentage >= 95 || isOverBudget) {
            colorClass = "from-rose-500 to-rose-600 shadow-rose-500/20";
            textColorClass = "text-rose-600 dark:text-rose-400";
        }
    } else {
        // Default / No Budget style
        colorClass = "from-blue-400 to-blue-500 shadow-blue-500/20";
        textColorClass = "text-blue-600 dark:text-blue-400";
    }

    const remainingSeconds = hasBudget ? Math.max(0, budgetSeconds - totalSeconds) : 0;
    const exceededSeconds = hasBudget ? Math.max(0, totalSeconds - budgetSeconds) : 0;

    return (
        <div className={cn("relative w-full rounded-2xl bg-muted/30 border border-border/50 p-4 overflow-hidden", className)}>
            {/* Background Decorative Gradient */}
            {isRunning && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mx-10 -my-10 pointer-events-none" />
            )}

            <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {hasBudget ? "Time Budget" : "Time Tracked"}
                        </span>
                        {isRunning && (
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className={cn("text-2xl font-bold tabular-nums tracking-tight", isOverBudget ? "text-rose-600 animate-pulse" : "text-foreground")}>
                            {formatTimeTrackingFull(totalSeconds).replace(/ (\w)/g, '$1')}
                        </span>
                        {hasBudget && (
                            <span className="text-sm text-muted-foreground font-medium">
                                / {formatTimeTrackingFull(budgetSeconds).replace(/ (\w)/g, '$1')}
                            </span>
                        )}
                    </div>
                </div>

                {hasBudget ? (
                    isOverBudget ? (
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-rose-600 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-900/50">
                                <AlertCircle className="w-3 h-3" />
                                Over Budget
                            </span>
                            <span className="text-[10px] text-rose-500 mt-1 font-medium">
                                +{formatTimeTrackingFull(exceededSeconds)}
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-end">
                            <span className={cn("text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-md border bg-background/50 backdrop-blur-sm", textColorClass)}>
                                {percentage >= 100 ? <AlertCircle className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                {Math.round(percentage)}% Used
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-1">
                                {formatTimeTrackingFull(remainingSeconds)} remaining
                            </span>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-md border bg-background/50 backdrop-blur-sm text-muted-foreground">
                            <Timer className="w-3 h-3" />
                            No Limit
                        </span>
                        {totalSeconds > 0 && (
                            <span className="text-[10px] text-muted-foreground mt-1">
                                Tracking active
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Use a simple progress bar for budget, or a 'pulse' bar for no budget */}
            <div className="relative h-4 w-full bg-muted/50 rounded-full overflow-hidden shadow-inner ring-1 ring-black/5 dark:ring-white/5">
                {hasBudget ? (
                    <div
                        className={cn(
                            "absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]",
                            "bg-gradient-to-r shadow-lg flex items-center justify-end pr-1",
                            colorClass
                        )}
                        style={{ width: `${percentage}%` }}
                    >
                        <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-white/40 to-transparent rounded-t-full" />
                        {percentage > 2 && (
                            <div className="h-2.5 w-2.5 bg-white rounded-full shadow-sm opacity-90 shadow-black/10" />
                        )}
                    </div>
                ) : (
                    /* Infinite pulse for no budget but running */
                    isRunning && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent w-[50%] animate-shimmer" />
                    )
                )}
            </div>
        </div>
    );
}
