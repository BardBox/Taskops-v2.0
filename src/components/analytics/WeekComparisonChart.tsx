import { cn } from "@/lib/utils";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
    Tooltip, Legend
} from "recharts";

interface DailyBreakdown {
    date: string;
    dayName: string;
    hours: number;
    sessions: number;
    breaks: number;
}

interface WeekComparisonChartProps {
    thisWeek: DailyBreakdown[];
    lastWeek: DailyBreakdown[];
    className?: string;
}

export function WeekComparisonChart({ thisWeek, lastWeek, className }: WeekComparisonChartProps) {
    // Merge data for comparison
    const chartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
        const thisDay = thisWeek.find(d => d.dayName === day) || { hours: 0 };
        const lastDay = lastWeek.find(d => d.dayName === day) || { hours: 0 };

        return {
            day,
            thisWeek: thisDay.hours,
            lastWeek: lastDay.hours,
        };
    });

    const thisWeekTotal = thisWeek.reduce((sum, d) => sum + d.hours, 0);
    const lastWeekTotal = lastWeek.reduce((sum, d) => sum + d.hours, 0);
    const percentChange = lastWeekTotal > 0
        ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
        : 0;

    return (
        <div className={cn("space-y-4", className)}>
            {/* Summary Header */}
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-primary" />
                        <span className="text-muted-foreground">This Week</span>
                        <span className="font-bold">{Math.round(thisWeekTotal * 10) / 10}h</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-primary/40" />
                        <span className="text-muted-foreground">Last Week</span>
                        <span className="font-medium text-muted-foreground">{Math.round(lastWeekTotal * 10) / 10}h</span>
                    </div>
                </div>
                {percentChange !== 0 && (
                    <span className={cn(
                        "font-medium",
                        percentChange > 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                        {percentChange > 0 ? '↑' : '↓'} {Math.abs(percentChange)}%
                    </span>
                )}
            </div>

            {/* Chart */}
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                        <XAxis
                            dataKey="day"
                            tick={{ fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${value}h`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                            formatter={(value: number) => [`${value}h`, '']}
                        />
                        <Bar
                            dataKey="lastWeek"
                            name="Last Week"
                            fill="hsl(var(--primary))"
                            opacity={0.3}
                            radius={[4, 4, 0, 0]}
                        />
                        <Bar
                            dataKey="thisWeek"
                            name="This Week"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
