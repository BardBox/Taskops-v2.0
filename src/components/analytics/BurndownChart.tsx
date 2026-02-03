import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
    Tooltip, ReferenceLine, Legend
} from "recharts";
import { TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface BurndownDataPoint {
    date: string; // Format: "DD/MM" or "Week X"
    planned: number; // Ideal hours remaining
    actual: number; // Actual hours remaining
}

interface BurndownChartProps {
    data: BurndownDataPoint[];
    totalBudget: number;
    className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BurndownChart({ data, totalBudget, className }: BurndownChartProps) {
    // Calculate status
    const status = useMemo(() => {
        if (data.length < 2) return { type: "neutral" as const, message: "Not enough data" };

        const latest = data[data.length - 1];
        const variance = latest.actual - latest.planned;

        if (variance > totalBudget * 0.1) {
            return {
                type: "danger" as const,
                message: `${Math.round(variance)}h behind schedule`,
                variance
            };
        } else if (variance < -totalBudget * 0.1) {
            return {
                type: "success" as const,
                message: `${Math.abs(Math.round(variance))}h ahead of schedule`,
                variance
            };
        }
        return {
            type: "neutral" as const,
            message: "On track",
            variance
        };
    }, [data, totalBudget]);

    const StatusIcon = status.type === "danger"
        ? AlertTriangle
        : status.type === "success"
            ? CheckCircle
            : TrendingDown;

    const statusColors = {
        danger: "text-red-500 bg-red-500/10",
        success: "text-emerald-500 bg-emerald-500/10",
        neutral: "text-blue-500 bg-blue-500/10",
    };

    if (data.length === 0) {
        return (
            <div className={cn("text-center py-8 text-muted-foreground", className)}>
                <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No burndown data available</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Status Badge */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-blue-500/50 border border-blue-500" />
                        <span className="text-muted-foreground">Ideal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-primary" />
                        <span className="text-muted-foreground">Actual</span>
                    </div>
                </div>
                <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    statusColors[status.type]
                )}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.message}
                </div>
            </div>

            {/* Chart */}
            <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="burndownActualGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${value}h`}
                            domain={[0, 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                            formatter={(value: number, name: string) => [
                                `${value}h`,
                                name === 'planned' ? 'Ideal Remaining' : 'Actual Remaining'
                            ]}
                        />
                        {/* Ideal burndown line */}
                        <Area
                            type="linear"
                            dataKey="planned"
                            stroke="hsl(var(--chart-3))"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fill="none"
                            dot={false}
                        />
                        {/* Actual burndown */}
                        <Area
                            type="monotone"
                            dataKey="actual"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#burndownActualGradient)"
                            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                        {/* Zero line */}
                        <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/50">
                <div className="text-center">
                    <p className="text-2xl font-bold tabular-nums">{totalBudget}h</p>
                    <p className="text-xs text-muted-foreground">Total Budget</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold tabular-nums">
                        {data.length > 0 ? data[data.length - 1].actual : 0}h
                    </p>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                </div>
                <div className="text-center">
                    <p className={cn(
                        "text-2xl font-bold tabular-nums",
                        status.type === "danger" && "text-red-500",
                        status.type === "success" && "text-emerald-500"
                    )}>
                        {totalBudget - (data.length > 0 ? data[data.length - 1].actual : 0)}h
                    </p>
                    <p className="text-xs text-muted-foreground">Burned</p>
                </div>
            </div>
        </div>
    );
}
