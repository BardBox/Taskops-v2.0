import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, isWithinInterval } from "date-fns";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  date: string;
  task_name: string;
  client_id: string | null;
  project_id: string | null;
  assignee_id: string;
  assigned_by_id: string;
  deadline: string | null;
  actual_delivery: string | null;
  status: string;
  urgency: string;
  asset_link: string | null;
  notes: string | null;
  reference_link_1: string | null;
  reference_link_2: string | null;
  reference_link_3: string | null;
  clients: { name: string } | null;
  projects: { name: string } | null;
  assignee: { full_name: string; avatar_url: string | null } | null;
  assigned_by: { full_name: string; avatar_url: string | null } | null;
  collaborators?: Array<{ user_id: string; profiles: { full_name: string; avatar_url: string | null } }>;
}

interface GanttChartProps {
  tasks: Task[];
  statuses: { label: string; color: string }[];
  onTaskClick: (taskId: string) => void;
}

export const GanttChart = ({ tasks, statuses, onTaskClick }: GanttChartProps) => {
  const [taskCollaborators, setTaskCollaborators] = useState<Map<string, any[]>>(new Map());

  // Fetch collaborators
  useEffect(() => {
    const fetchCollaborators = async () => {
      const collabMap = new Map<string, any[]>();
      
      // Fetch collaborators for all tasks
      for (const task of tasks) {
        const { data } = await supabase
          .from("task_collaborators")
          .select("user_id, profiles(full_name, avatar_url)")
          .eq("task_id", task.id);
        
        if (data) {
          collabMap.set(task.id, data);
        }
      }
      
      setTaskCollaborators(collabMap);
    };
    
    fetchCollaborators();
  }, [tasks]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const { timelineRange, tasksWithTimeline } = useMemo(() => {
    // Filter tasks that have deadlines
    const tasksWithDeadlines = tasks.filter(task => task.deadline);
    
    if (tasksWithDeadlines.length === 0) {
      const today = new Date();
      return {
        timelineRange: {
          start: startOfMonth(today),
          end: endOfMonth(today),
          days: eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) })
        },
        tasksWithTimeline: []
      };
    }

    // Find min and max dates
    const dates = tasksWithDeadlines.flatMap(task => [
      new Date(task.date),
      task.deadline ? new Date(task.deadline) : null,
      task.actual_delivery ? new Date(task.actual_delivery) : null
    ].filter(Boolean) as Date[]);

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const start = startOfMonth(minDate);
    const end = endOfMonth(maxDate);
    const days = eachDayOfInterval({ start, end });

    // Calculate task positions
    const tasksWithPositions = tasksWithDeadlines.map(task => {
      const taskStart = new Date(task.date);
      const taskEnd = task.deadline ? new Date(task.deadline) : taskStart;
      const actualEnd = task.actual_delivery ? new Date(task.actual_delivery) : null;

      const startOffset = differenceInDays(taskStart, start);
      const duration = differenceInDays(taskEnd, taskStart) + 1;
      const actualDuration = actualEnd ? differenceInDays(actualEnd, taskStart) + 1 : 0;

      return {
        ...task,
        startOffset,
        duration,
        actualDuration,
        isDelayed: actualEnd && actualEnd > taskEnd
      };
    });

    return {
      timelineRange: { start, end, days },
      tasksWithTimeline: tasksWithPositions
    };
  }, [tasks]);

  const getStatusColor = (status: string) => {
    const statusItem = statuses.find(s => s.label === status);
    return statusItem?.color || "bg-muted";
  };

  const dayWidth = 40; // pixels per day
  const rowHeight = 60; // pixels per row

  if (tasksWithTimeline.length === 0) {
    return (
      <div className="text-center py-16 px-4 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No tasks with deadlines</h3>
        <p className="text-muted-foreground">
          Add deadlines to your tasks to see them in the Calendar view.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Card className="p-4 overflow-x-auto">
        <div className="min-w-max">
          {/* Timeline Header */}
          <div className="flex border-b mb-4 pb-2">
            <div className="w-64 flex-shrink-0 font-semibold text-sm">Task</div>
            <div className="flex">
              {timelineRange.days.map((day, index) => (
                <div
                  key={index}
                  className="text-center text-xs"
                  style={{ width: `${dayWidth}px` }}
                >
                  <div className="font-medium">{format(day, 'MMM d')}</div>
                  <div className="text-muted-foreground">{format(day, 'EEE')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-2">
            {tasksWithTimeline.map((task) => (
              <div
                key={task.id}
                className="flex items-center hover:bg-muted/30 rounded-lg p-2 transition-colors cursor-pointer group"
                style={{ height: `${rowHeight}px` }}
                onClick={() => onTaskClick(task.id)}
              >
                {/* Task Info */}
                <div className="w-64 flex-shrink-0 pr-4">
                  <div className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {task.task_name}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5 border border-border">
                        <AvatarImage src={task.assignee?.avatar_url || undefined} alt={task.assignee?.full_name} />
                        <AvatarFallback className="text-[8px]">
                          {task.assignee ? getInitials(task.assignee.full_name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{task.assignee?.full_name}</span>
                    </div>
                    
                    {/* Show collaborator avatars */}
                    {taskCollaborators.get(task.id)?.length > 0 && (
                      <div className="flex -space-x-2">
                        {taskCollaborators.get(task.id)?.slice(0, 2).map((collab, idx) => (
                          <TooltipProvider key={idx}>
                            <Tooltip>
                              <TooltipTrigger>
                                <Avatar className="h-5 w-5 border-2 border-background">
                                  <AvatarImage src={collab.profiles.avatar_url || undefined} alt={collab.profiles.full_name} />
                                  <AvatarFallback className="text-[8px]">
                                    {getInitials(collab.profiles.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="flex items-center gap-1">
                                  {collab.profiles.full_name}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                        {taskCollaborators.get(task.id)?.length > 2 && (
                          <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px]">
                            +{taskCollaborators.get(task.id).length - 2}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 relative" style={{ height: '40px' }}>
                  {/* Planned Duration */}
                  <div
                    className={`absolute h-6 rounded-lg ${getStatusColor(task.status)} opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-medium group-hover:shadow-md`}
                    style={{
                      left: `${task.startOffset * dayWidth}px`,
                      width: `${Math.max(task.duration * dayWidth - 4, dayWidth)}px`,
                      top: '7px'
                    }}
                  >
                    {task.duration}d
                  </div>

                  {/* Actual Duration (if delivered) */}
                  {task.actualDuration > 0 && (
                    <div
                      className={`absolute h-6 rounded-lg ${task.isDelayed ? 'bg-destructive' : 'bg-green-500'} opacity-80 hover:opacity-100 transition-opacity border-2 border-background group-hover:shadow-md`}
                      style={{
                        left: `${task.startOffset * dayWidth}px`,
                        width: `${Math.max(task.actualDuration * dayWidth - 4, dayWidth)}px`,
                        top: '7px'
                      }}
                      title={task.isDelayed ? 'Delayed' : 'Completed on time'}
                    />
                  )}

                  {/* Today Indicator */}
                  {isWithinInterval(new Date(), {
                    start: timelineRange.start,
                    end: timelineRange.end
                  }) && (
                    <div
                      className="absolute w-0.5 h-full bg-primary/40"
                      style={{
                        left: `${differenceInDays(new Date(), timelineRange.start) * dayWidth}px`
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/60" />
              <span>Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>Completed on time</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-destructive" />
              <span>Delayed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-primary" />
              <span>Today</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
