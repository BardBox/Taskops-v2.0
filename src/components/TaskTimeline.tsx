import { format } from "date-fns";
import { Calendar, Flag } from "lucide-react";

interface TaskTimelineProps {
  dateAssigned: string;
  deadline: string;
  dateSubmitted?: string | null;
}

export const TaskTimeline = ({ dateAssigned, deadline, dateSubmitted }: TaskTimelineProps) => {
  const startDate = new Date(dateAssigned);
  const endDate = new Date(deadline);
  const currentDate = new Date();
  const submittedDate = dateSubmitted ? new Date(dateSubmitted) : null;

  // Calculate position percentages
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = currentDate.getTime() - startDate.getTime();
  const currentPosition = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  
  // Calculate submitted position if exists
  const submittedPosition = submittedDate 
    ? Math.max(0, Math.min(100, ((submittedDate.getTime() - startDate.getTime()) / totalDuration) * 100))
    : null;

  // Determine color based on progress
  const getTimelineColor = () => {
    if (submittedDate) {
      return submittedPosition! <= 100 ? "hsl(142, 76%, 36%)" : "hsl(48, 96%, 53%)"; // Green if on time, yellow if late
    }
    
    if (currentPosition < 50) return "hsl(142, 76%, 36%)"; // Green
    if (currentPosition < 75) return "hsl(48, 96%, 53%)"; // Yellow
    if (currentPosition < 100) return "hsl(25, 95%, 53%)"; // Orange
    return "hsl(0, 84%, 60%)"; // Red (overdue)
  };

  const getGradient = () => {
    const color = getTimelineColor();
    return `linear-gradient(to right, ${color} 0%, ${color} ${currentPosition}%, hsl(var(--muted)) ${currentPosition}%, hsl(var(--muted)) 100%)`;
  };

  const isOverdue = currentDate > endDate && !submittedDate;
  const completedOnTime = submittedDate && submittedDate <= endDate;
  const completedLate = submittedDate && submittedDate > endDate;

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Task Timeline</span>
        </div>
        <div className="flex items-center gap-2">
          {isOverdue && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive">
              Overdue
            </span>
          )}
          {completedOnTime && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-600">
              Completed On Time
            </span>
          )}
          {completedLate && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-600">
              Completed Late
            </span>
          )}
        </div>
      </div>

      {/* Timeline Bar */}
      <div className="relative">
        <div 
          className="h-3 rounded-full overflow-hidden shadow-sm border"
          style={{ background: getGradient() }}
        >
          {/* Current date marker (if task not submitted) */}
          {!submittedDate && currentPosition >= 0 && currentPosition <= 100 && (
            <div 
              className="absolute top-0 h-3 w-1 bg-foreground shadow-lg"
              style={{ left: `${currentPosition}%`, transform: 'translateX(-50%)' }}
            />
          )}
          
          {/* Submitted marker (if task submitted) */}
          {submittedDate && submittedPosition !== null && (
            <div 
              className="absolute top-0 h-3 flex items-center"
              style={{ left: `${submittedPosition}%`, transform: 'translateX(-50%)' }}
            >
              <Flag className="h-4 w-4 text-foreground drop-shadow-md" fill="currentColor" />
            </div>
          )}
        </div>

        {/* Date labels */}
        <div className="flex justify-between mt-2 text-xs">
          <div className="flex flex-col items-start">
            <span className="font-semibold text-foreground">Start</span>
            <span className="text-muted-foreground">{format(startDate, "MMM d, yyyy")}</span>
          </div>
          
          {submittedDate && (
            <div className="flex flex-col items-center">
              <span className="font-semibold text-foreground">Submitted</span>
              <span className="text-muted-foreground">{format(submittedDate, "MMM d, yyyy")}</span>
              {completedLate && (
                <span className="text-xs font-semibold text-yellow-600 mt-0.5">
                  Delayed ({Math.ceil((submittedDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))} days)
                </span>
              )}
            </div>
          )}
          
          <div className="flex flex-col items-end">
            <span className="font-semibold text-foreground">Deadline</span>
            <span className="text-muted-foreground">{format(endDate, "MMM d, yyyy")}</span>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="text-xs text-center text-muted-foreground">
        {submittedDate ? (
          completedLate ? 
            `Completed ${Math.floor(submittedPosition!)}% into timeline` : 
            `Completed ${Math.floor(submittedPosition!)}% of timeline`
        ) : (
          currentPosition < 0 ? "Not started yet" : 
          currentPosition > 100 ? `${Math.floor(currentPosition - 100)}% overdue` :
          `${Math.floor(currentPosition)}% of timeline elapsed`
        )}
      </div>
    </div>
  );
};
