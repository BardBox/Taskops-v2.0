import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock, Play, Pause, Square } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTimeTracking, formatTimeTrackingFull } from "@/hooks/useTaskTimeTracking";

// Use TimeTrackingRecord consistent with useTaskTimeTracking
interface TimeTrackingRecord {
  id: string;
  task_id: string;
  user_id: string;
  // Modern fields
  is_running: boolean;
  started_at: string | null;
  paused_at: string | null;
  total_seconds: number;
  last_status: string | null;
  // Legacy fields (optional for compatibility if needed, but we prefer modern)
  tracking_status?: 'idle' | 'active' | 'paused' | 'stopped';
  last_active_at?: string | null;
  created_at?: string;
  updated_at?: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

// Local calculation function to avoid import issues
const calcTotalTime = (record: TimeTrackingRecord): number => {
  let totalSeconds = record.total_seconds;

  if (record.is_running && record.started_at) {
    const elapsed = Math.floor((Date.now() - new Date(record.started_at).getTime()) / 1000);
    totalSeconds += elapsed;
  }

  return totalSeconds;
};

interface TimeTrackingBadgeProps {
  records: TimeTrackingRecord[];
  variant?: 'circle' | 'inline' | 'card';
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  className?: string;
}

export function TimeTrackingBadge({
  records,
  variant = 'circle',
  size = 'sm',
  showStatus = false,
  className,
}: TimeTrackingBadgeProps) {
  const [displayTime, setDisplayTime] = useState("0:00");
  const [isActive, setIsActive] = useState(false);

  // Calculate total time across all records
  const calculateTotalTimeFromRecords = () => {
    return records.reduce((total, record) => total + calcTotalTime(record), 0);
  };

  // Check if any record is active
  const checkIsActive = () => {
    return records.some(r => r.is_running);
  };

  // Update display time
  useEffect(() => {
    const updateTime = () => {
      const totalSeconds = calculateTotalTimeFromRecords();
      setDisplayTime(formatTimeTracking(totalSeconds, false, null));
      setIsActive(checkIsActive());
    };

    updateTime();

    // Update every second if active
    let interval: NodeJS.Timeout | null = null;
    if (checkIsActive()) {
      interval = setInterval(updateTime, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [records]);

  if (records.length === 0) {
    return null;
  }

  const totalSeconds = calculateTotalTimeFromRecords();
  const fullTimeDisplay = formatTimeTrackingFull(totalSeconds, false, null);

  // Get status icon
  const StatusIcon = () => {
    if (!showStatus) return null;

    const hasActive = records.some(r => r.is_running);
    // Legacy mapping or just assume paused if not running but has time?
    // Modern schema doesn't have explicit 'paused' status string in is_running (it's strict boolean)
    // But we might have last_status.
    const isPaused = !hasActive && totalSeconds > 0;

    if (hasActive) {
      return <Play className="h-2.5 w-2.5 fill-current animate-pulse" />;
    }
    if (isPaused) {
      return <Pause className="h-2.5 w-2.5" />;
    }
    return <Square className="h-2.5 w-2.5 fill-current" />;
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
  };

  // Status colors
  const getStatusColor = () => {
    if (records.some(r => r.is_running)) {
      return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
    }
    if (totalSeconds > 0) {
      // Paused/Inactive
      return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
    }
    return 'bg-muted/50 text-muted-foreground border-border/50';
  };

  if (variant === 'circle') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "rounded-full flex items-center justify-center border font-medium",
                sizeClasses[size],
                getStatusColor(),
                isActive && "ring-2 ring-green-500/30 ring-offset-1 ring-offset-background",
                className
              )}
            >
              {displayTime}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">Time Tracked: {fullTimeDisplay}</span>
              </div>
              {records.length > 1 && (
                <div className="text-xs text-muted-foreground mt-1 pt-1 border-t">
                  <p className="mb-1">By contributor:</p>
                  {records.map((record, idx) => (
                    <div key={idx} className="flex justify-between gap-2">
                      <span>{record.profiles?.full_name || "Unknown"}</span>
                      <span>{formatTimeTrackingFull(calcTotalTime(record), false, null)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
        <Clock className="h-3 w-3" />
        <span className="text-xs font-medium">{displayTime}</span>
        <StatusIcon />
      </div>
    );
  }

  // Card variant - more detailed display
  return (
    <div className={cn("p-3 rounded-lg border bg-card", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-full",
            getStatusColor()
          )}>
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Time Tracked</p>
            <p className="text-2xl font-bold">{fullTimeDisplay}</p>
          </div>
        </div>
        {showStatus && (records.some(r => r.is_running || r.total_seconds > 0)) && (
          <div className="flex items-center gap-1.5">
            <StatusIcon />
            <span className="text-xs text-muted-foreground capitalize">
              {records.some(r => r.is_running) ? 'Active' :
                'Paused'}
            </span>
          </div>
        )}
      </div>

      {records.length > 1 && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">By contributor</p>
          {records.map((record, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span>{record.profiles?.full_name || "Unknown"}</span>
              <span className="font-medium">{formatTimeTrackingFull(calcTotalTime(record), false, null)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
