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

  // Helper function to get calendar days difference (inclusive)
  const getDaysDifference = (from: Date, to: Date) => {
    const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    const diffTime = toDay.getTime() - fromDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // +1 for inclusive counting
  };

  // Calculate position percentages based on day count (no caps - can exceed 100%)
  const totalDays = getDaysDifference(startDate, endDate);
  const elapsedDays = getDaysDifference(startDate, currentDate);
  const currentPosition = (elapsedDays / totalDays) * 100;
  
  // Calculate submitted position if exists (no caps - can exceed 100%)
  const submittedPosition = submittedDate 
    ? (getDaysDifference(startDate, submittedDate) / totalDays) * 100
    : null;

  // Determine color based on timeline utilisation percentage
  const getTimelineColor = () => {
    const percentage = submittedDate ? submittedPosition! : currentPosition;
    
    if (percentage < 70) return "hsl(142, 76%, 36%)"; // Green (0-70%)
    if (percentage <= 100) return "hsl(48, 96%, 53%)"; // Yellow (70-100%)
    if (percentage <= 130) {
      // Transition from yellow to red (100-130%)
      const transitionProgress = (percentage - 100) / 30;
      return `hsl(${48 - (48 * transitionProgress)}, ${96 - (12 * transitionProgress)}%, ${53 + (7 * transitionProgress)}%)`;
    }
    return "hsl(0, 84%, 60%)"; // Red (130%+)
  };

  const getGradient = () => {
    const color = getTimelineColor();
    const visualPosition = Math.min(100, submittedDate ? submittedPosition! : currentPosition);
    return `linear-gradient(to right, ${color} 0%, ${color} ${visualPosition}%, hsl(var(--muted)) ${visualPosition}%, hsl(var(--muted)) 100%)`;
  };

  const isOverdue = currentPosition > 100 && !submittedDate;
  const completedOnTime = submittedDate && submittedPosition! <= 100;
  const completedLate = submittedDate && submittedPosition! > 100;

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
          {!submittedDate && (
            <div 
              className="absolute top-0 h-3 w-1 bg-foreground shadow-lg"
              style={{ left: `${Math.min(100, Math.max(0, currentPosition))}%`, transform: 'translateX(-50%)' }}
            />
          )}
          
          {/* Submitted marker (if task submitted) */}
          {submittedDate && submittedPosition !== null && (
            <div 
              className="absolute top-0 h-3 flex items-center"
              style={{ left: `${Math.min(100, Math.max(0, submittedPosition))}%`, transform: 'translateX(-50%)' }}
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
              {completedLate && submittedDate && (
                <span className="text-xs font-semibold text-red-600 mt-0.5">
                  {Math.ceil((submittedDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))} days late
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
          `${Math.floor(submittedPosition!)}% of timeline utilised`
        ) : (
          currentPosition < 0 ? "Not started yet" : 
          `${Math.floor(currentPosition)}% of timeline utilised`
        )}
      </div>
    </div>
  );
};
