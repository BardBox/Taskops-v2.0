import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Clock, Sun, Moon, Zap, AlertCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// TYPES
// ============================================================================

export interface CapacityData {
    hourlyDistribution: { hour: number; avgHours: number }[];
    dailyDistribution: { day: string; avgHours: number }[];
    peakHour: number;
    quietestHour: number;
    busiestDay: string;
    quietestDay: string;
    avgDailyHours: number;
    utilizationRate: number; // 0-100
}

interface CapacityPlanningProps {
    data: CapacityData;
    className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CapacityPlanning({ data, className }: CapacityPlanningProps) {
    const insights = useMemo(() => {
        const results = [];

        // Peak productivity window
        if (data.peakHour) {
            const peakStart = data.peakHour;
            const peakEnd = (data.peakHour + 3) % 24;
            results.push({
                type: "peak" as const,
                icon: Zap,
                title: "Peak Productivity",
                description: `Highest activity between ${peakStart}:00-${peakEnd}:00`,
                color: "text-emerald-500",
                bgColor: "bg-emerald-500/10",
            });
        }

        // Underutilized time
        if (data.quietestHour !== undefined) {
            results.push({
                type: "quiet" as const,
                icon: Moon,
                title: "Low Activity Window",
                description: `Quietest around ${data.quietestHour}:00 - consider meetings/admin`,
                color: "text-blue-500",
                bgColor: "bg-blue-500/10",
            });
        }

        // Best day
        if (data.busiestDay) {
            results.push({
                type: "busy" as const,
                icon: TrendingUp,
                title: "Most Productive Day",
                description: `${data.busiestDay} has the highest work output`,
                color: "text-primary",
                bgColor: "bg-primary/10",
            });
        }

        // Utilization warning
        if (data.utilizationRate < 70) {
            results.push({
                type: "warning" as const,
                icon: AlertCircle,
                title: "Capacity Available",
                description: `Team running at ${data.utilizationRate}% utilization`,
                color: "text-amber-500",
                bgColor: "bg-amber-500/10",
            });
        }

        return results;
    }, [data]);

    const formatHour = (hour: number) => {
        if (hour === 0) return "12am";
        if (hour === 12) return "12pm";
        return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                    <Sun className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-bold">{formatHour(data.peakHour)}</p>
                    <p className="text-xs text-muted-foreground">Peak Hour</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                    <Moon className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-bold">{formatHour(data.quietestHour)}</p>
                    <p className="text-xs text-muted-foreground">Quietest Hour</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{data.avgDailyHours.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Avg Daily</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                    <Zap className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                    <p className="text-lg font-bold">{data.utilizationRate}%</p>
                    <p className="text-xs text-muted-foreground">Utilization</p>
                </div>
            </div>

            {/* Hourly Heatmap Mini */}
            <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Hourly Activity Pattern</p>
                <div className="flex gap-0.5">
                    {data.hourlyDistribution.map((h) => {
                        const maxHours = Math.max(...data.hourlyDistribution.map(d => d.avgHours), 1);
                        const intensity = h.avgHours / maxHours;
                        return (
                            <div
                                key={h.hour}
                                className="flex-1 h-8 rounded-sm transition-all"
                                style={{
                                    backgroundColor: `hsl(var(--primary) / ${Math.max(0.1, intensity)})`,
                                }}
                                title={`${formatHour(h.hour)}: ${h.avgHours.toFixed(1)}h avg`}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>6am</span>
                    <span>12pm</span>
                    <span>6pm</span>
                    <span>10pm</span>
                </div>
            </div>

            {/* Insights List */}
            <div className="space-y-2">
                {insights.map((insight, index) => {
                    const Icon = insight.icon;
                    return (
                        <div
                            key={index}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border border-border/50",
                                insight.bgColor
                            )}
                        >
                            <Icon className={cn("h-4 w-4 mt-0.5", insight.color)} />
                            <div>
                                <p className="text-sm font-medium">{insight.title}</p>
                                <p className="text-xs text-muted-foreground">{insight.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
