import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskTimerProps {
    totalSecondsSnapshot: number;
    runningStartTimes: string[]; // List of started_at for all active users on this task
    isCurrentUserRunning: boolean;
    onToggle: () => void;
    disabled?: boolean;
    className?: string;
}

export function TaskTimer({
    totalSecondsSnapshot,
    runningStartTimes,
    isCurrentUserRunning,
    onToggle,
    disabled = false,
    className
}: TaskTimerProps) {
    const [displaySeconds, setDisplaySeconds] = useState(totalSecondsSnapshot);

    // Initial sync
    useEffect(() => {
        calculateTime();
    }, [totalSecondsSnapshot, runningStartTimes]);

    const calculateTime = () => {
        const now = Date.now();
        let addedSeconds = 0;

        runningStartTimes.forEach(start => {
            if (start) {
                addedSeconds += Math.floor((now - new Date(start).getTime()) / 1000);
            }
        });

        setDisplaySeconds(totalSecondsSnapshot + addedSeconds);
    };

    // Live tick
    useEffect(() => {
        if (runningStartTimes.length === 0) {
            return;
        }

        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [totalSecondsSnapshot, runningStartTimes]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        // Compact format for table cell
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    return (
        <div className={cn("flex items-center gap-1.5", className)} onClick={(e) => e.stopPropagation()}>
            <div className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors font-mono text-xs font-medium min-w-[64px] justify-between",
                isCurrentUserRunning
                    ? "bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/20"
                    : runningStartTimes.length > 0
                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                        : "bg-muted text-muted-foreground border border-transparent"
            )}>
                <span className="flex-1 text-center">{formatTime(displaySeconds)}</span>

                {!disabled && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-5 w-5 -mr-1 hover:bg-transparent",
                            isCurrentUserRunning ? "text-green-600 hover:text-green-800" : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                    >
                        {isCurrentUserRunning ? (
                            <Pause className="h-3 w-3 fill-current" />
                        ) : (
                            <Play className="h-3 w-3 fill-current" />
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
