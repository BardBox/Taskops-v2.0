import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Coffee, Play, Clock } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// TYPES
// ============================================================================

export interface TimeBlock {
    id: string;
    type: "work" | "break";
    startTime: Date;
    endTime: Date;
    taskName?: string;
    duration: number; // in minutes
}

interface DailyTimelineProps {
    blocks: TimeBlock[];
    dayStart?: number; // Hour (0-23), default 6
    dayEnd?: number; // Hour (0-23), default 22
    className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DailyTimeline({
    blocks,
    dayStart = 6,
    dayEnd = 22,
    className,
}: DailyTimelineProps) {
    // Generate hour markers
    const hours = useMemo(() => {
        const result: number[] = [];
        for (let h = dayStart; h <= dayEnd; h++) {
            result.push(h);
        }
        return result;
    }, [dayStart, dayEnd]);

    const totalMinutes = (dayEnd - dayStart) * 60;

    // Calculate block positions
    const positionedBlocks = useMemo(() => {
        return blocks.map((block) => {
            const startHour = block.startTime.getHours();
            const startMin = block.startTime.getMinutes();
            const endHour = block.endTime.getHours();
            const endMin = block.endTime.getMinutes();

            const startOffset = (startHour - dayStart) * 60 + startMin;
            const endOffset = (endHour - dayStart) * 60 + endMin;

            // Clamp to visible range
            const clampedStart = Math.max(0, startOffset);
            const clampedEnd = Math.min(totalMinutes, endOffset);

            const left = (clampedStart / totalMinutes) * 100;
            const width = ((clampedEnd - clampedStart) / totalMinutes) * 100;

            return {
                ...block,
                left,
                width,
                isVisible: width > 0,
            };
        }).filter((b) => b.isVisible);
    }, [blocks, dayStart, totalMinutes]);

    // Calculate summary stats
    const summary = useMemo(() => {
        const workBlocks = blocks.filter((b) => b.type === "work");
        const breakBlocks = blocks.filter((b) => b.type === "break");

        return {
            totalWork: workBlocks.reduce((sum, b) => sum + b.duration, 0),
            totalBreak: breakBlocks.reduce((sum, b) => sum + b.duration, 0),
            sessions: workBlocks.length,
        };
    }, [blocks]);

    const formatDuration = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    if (blocks.length === 0) {
        return (
            <div className={cn("text-center py-8 text-muted-foreground", className)}>
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No activity recorded for this day</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Summary Row */}
            <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                    <span className="text-muted-foreground">Work:</span>
                    <span className="font-medium">{formatDuration(summary.totalWork)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-amber-500" />
                    <span className="text-muted-foreground">Break:</span>
                    <span className="font-medium">{formatDuration(summary.totalBreak)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{summary.sessions} sessions</span>
                </div>
            </div>

            {/* Timeline Container */}
            <div className="relative">
                {/* Hour markers */}
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    {hours.filter((_, i) => i % 2 === 0).map((hour) => (
                        <span key={hour} className="tabular-nums">
                            {hour.toString().padStart(2, "0")}:00
                        </span>
                    ))}
                </div>

                {/* Timeline track */}
                <div className="relative h-12 bg-muted/30 rounded-lg overflow-hidden border border-border/50">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                        {hours.map((hour, i) => (
                            <div
                                key={hour}
                                className={cn(
                                    "flex-1 border-l border-border/30",
                                    i === 0 && "border-l-0"
                                )}
                            />
                        ))}
                    </div>

                    {/* Time blocks */}
                    <TooltipProvider>
                        {positionedBlocks.map((block) => (
                            <Tooltip key={block.id}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "absolute top-1 bottom-1 rounded-md cursor-pointer transition-all duration-200",
                                            "hover:ring-2 hover:ring-offset-1 hover:ring-offset-background",
                                            block.type === "work"
                                                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:ring-emerald-500/50"
                                                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:ring-amber-500/50"
                                        )}
                                        style={{
                                            left: `${block.left}%`,
                                            width: `${Math.max(block.width, 0.5)}%`,
                                        }}
                                    >
                                        {/* Show icon for larger blocks */}
                                        {block.width > 3 && (
                                            <div className="h-full flex items-center justify-center text-white/80">
                                                {block.type === "work" ? (
                                                    <Play className="h-3.5 w-3.5" />
                                                ) : (
                                                    <Coffee className="h-3.5 w-3.5" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px]">
                                    <div className="space-y-1">
                                        <div className="font-medium flex items-center gap-1.5">
                                            {block.type === "work" ? (
                                                <>
                                                    <Play className="h-3 w-3 text-emerald-500" />
                                                    Work Session
                                                </>
                                            ) : (
                                                <>
                                                    <Coffee className="h-3 w-3 text-amber-500" />
                                                    Break
                                                </>
                                            )}
                                        </div>
                                        {block.taskName && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {block.taskName}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {format(block.startTime, "HH:mm")} - {format(block.endTime, "HH:mm")}
                                        </p>
                                        <p className="text-xs font-medium">{formatDuration(block.duration)}</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );
}
