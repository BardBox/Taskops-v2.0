import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface HeatmapCell {
    dayOfWeek: number; // 0-6 (Sun-Sat)
    hour: number; // 0-23
    totalMinutes: number;
    sessionCount: number;
}

interface TimeHeatmapProps {
    data: HeatmapCell[];
    className?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function TimeHeatmap({ data, className }: TimeHeatmapProps) {
    // Create a lookup map
    const cellMap = useMemo(() => {
        const map = new Map<string, HeatmapCell>();
        data.forEach(cell => {
            map.set(`${cell.dayOfWeek}-${cell.hour}`, cell);
        });
        return map;
    }, [data]);

    // Find max value for scaling
    const maxMinutes = useMemo(() => {
        return Math.max(...data.map(d => d.totalMinutes), 1);
    }, [data]);

    const getIntensity = (minutes: number) => {
        const ratio = minutes / maxMinutes;
        if (ratio === 0) return 'bg-slate-100 dark:bg-slate-800/50';
        if (ratio < 0.25) return 'bg-emerald-200 dark:bg-emerald-900/40';
        if (ratio < 0.5) return 'bg-emerald-400 dark:bg-emerald-700/60';
        if (ratio < 0.75) return 'bg-emerald-500 dark:bg-emerald-600/80';
        return 'bg-emerald-600 dark:bg-emerald-500';
    };

    const formatHour = (hour: number) => {
        if (hour === 0) return '12a';
        if (hour === 12) return '12p';
        if (hour < 12) return `${hour}a`;
        return `${hour - 12}p`;
    };

    return (
        <div className={cn("overflow-x-auto", className)}>
            <div className="min-w-[600px]">
                {/* Hour labels */}
                <div className="flex mb-1">
                    <div className="w-10 shrink-0" /> {/* Spacer for day labels */}
                    <div className="flex-1 flex">
                        {HOURS.filter((_, i) => i % 3 === 0).map(hour => (
                            <div
                                key={hour}
                                className="flex-1 text-[10px] text-muted-foreground text-center"
                                style={{ width: `${100 / 8}%` }}
                            >
                                {formatHour(hour)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="space-y-1">
                    {DAYS.map((day, dayIndex) => (
                        <div key={day} className="flex items-center gap-1">
                            {/* Day label */}
                            <div className="w-10 shrink-0 text-xs text-muted-foreground font-medium">
                                {day}
                            </div>

                            {/* Hour cells */}
                            <div className="flex-1 flex gap-0.5">
                                {HOURS.map(hour => {
                                    const cell = cellMap.get(`${dayIndex}-${hour}`);
                                    const minutes = cell?.totalMinutes || 0;
                                    const sessions = cell?.sessionCount || 0;

                                    return (
                                        <div
                                            key={`${dayIndex}-${hour}`}
                                            className={cn(
                                                "flex-1 h-5 rounded-[3px] transition-all duration-200 cursor-default",
                                                "hover:ring-2 hover:ring-primary/50 hover:ring-offset-1 hover:ring-offset-background",
                                                getIntensity(minutes)
                                            )}
                                            title={`${day} ${formatHour(hour)}: ${minutes}m (${sessions} sessions)`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-3">
                    <span className="text-[10px] text-muted-foreground">Less</span>
                    <div className="flex gap-0.5">
                        {['bg-slate-100 dark:bg-slate-800/50', 'bg-emerald-200 dark:bg-emerald-900/40', 'bg-emerald-400 dark:bg-emerald-700/60', 'bg-emerald-500 dark:bg-emerald-600/80', 'bg-emerald-600 dark:bg-emerald-500'].map((color, i) => (
                            <div key={i} className={cn("w-3 h-3 rounded-[2px]", color)} />
                        ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">More</span>
                </div>
            </div>
        </div>
    );
}
