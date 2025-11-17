import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit2, ExternalLink, FileText, Star, Calendar, Clock, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BadgeDropdown } from "@/components/BadgeDropdown";

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
  assignee: { full_name: string } | null;
  assigned_by: { full_name: string } | null;
  task_comments?: Array<{ message: string; created_at: string }>;
}

interface TaskCardProps {
  task: Task;
  userRole: string;
  isSelected?: boolean;
  isAppreciated?: boolean;
  statuses: Array<{ label: string; color: string }>;
  urgencies: Array<{ label: string; color: string }>;
  onSelect?: (checked: boolean) => void;
  onEdit?: () => void;
  onClick?: () => void;
  onStatusChange?: (newStatus: string) => void;
  onUrgencyChange?: (newUrgency: string) => void;
  onAppreciationToggle?: (e: React.MouseEvent) => void;
  onSubmit?: () => void;
  onNotesClick?: () => void;
}

export const TaskCard = ({
  task,
  userRole,
  isSelected,
  isAppreciated,
  statuses,
  urgencies,
  onSelect,
  onEdit,
  onClick,
  onStatusChange,
  onUrgencyChange,
  onAppreciationToggle,
  onSubmit,
  onNotesClick,
}: TaskCardProps) => {
  const statusConfig = statuses.find((s) => s.label === task.status);
  const urgencyConfig = urgencies.find((u) => u.label === task.urgency);
  
  const isToday = (date: string | null) => {
    if (!date) return false;
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const lastComment = task.task_comments?.[0];

  return (
    <div 
      className={cn(
        "group relative bg-muted/10 rounded-lg border border-border/50 p-6 hover-lift hover-glow transition-all duration-300",
        "cursor-pointer",
        isSelected && "ring-2 ring-primary/50 border-primary/50"
      )}
      onClick={onClick}
    >
      {/* Status Indicator Bar */}
      <div 
        className="status-indicator"
        style={{ 
          backgroundColor: statusConfig?.color || "#94a3b8",
        }}
      />

      {/* Header Section */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {userRole === "project_owner" && onSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
              {task.task_name}
            </h3>
            
            {/* Client & Project */}
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-3">
              {task.clients && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  {task.clients.name}
                </span>
              )}
              {task.projects && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50">
                  {task.projects.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {userRole !== "team_member" && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {userRole === "project_manager" && onAppreciationToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAppreciationToggle}
              className={cn(
                "h-8 w-8 p-0",
                isAppreciated && "text-yellow-500"
              )}
            >
              <Star className={cn("h-4 w-4", isAppreciated && "fill-current")} />
            </Button>
          )}
        </div>
      </div>

      {/* Status & Urgency Badges */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {onStatusChange ? (
          <div onClick={(e) => e.stopPropagation()}>
            <BadgeDropdown
              value={task.status}
              options={statuses}
              onChange={onStatusChange}
            />
          </div>
        ) : (
          <Badge
            style={{
              backgroundColor: statusConfig?.color,
              color: "#ffffff",
            }}
          >
            {statusConfig?.label || task.status}
          </Badge>
        )}

        {onUrgencyChange ? (
          <div onClick={(e) => e.stopPropagation()}>
            <BadgeDropdown
              value={task.urgency}
              options={urgencies}
              onChange={onUrgencyChange}
            />
          </div>
        ) : (
          <Badge
            style={{
              backgroundColor: urgencyConfig?.color,
              color: "#ffffff",
            }}
          >
            {urgencyConfig?.label || task.urgency}
          </Badge>
        )}
      </div>

      {/* Meta Information Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        {/* Date */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary/60" />
          <span className={isToday(task.date) ? "font-semibold text-foreground" : ""}>
            {format(new Date(task.date), "MMM d, yyyy")}
          </span>
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 text-primary/60" />
            <span>{format(new Date(task.deadline), "MMM d, yyyy")}</span>
          </div>
        )}

        {/* Assignee */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 border-2 border-primary/20">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {task.assignee ? getInitials(task.assignee.full_name) : "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground truncate">
            {task.assignee?.full_name || "Unassigned"}
          </span>
        </div>

        {/* Assigned By */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <User className="h-4 w-4 text-primary/60" />
          <span className="truncate">{task.assigned_by?.full_name || "Unknown"}</span>
        </div>
      </div>

      {/* Last Comment Preview */}
      {lastComment && (
        <div className="mb-4 pb-4 border-b border-border/50">
          <div className="flex items-start gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground truncate">
              {lastComment.message}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons Footer */}
      <div className="flex items-center gap-2 pt-4 border-t border-border/50">
        {task.asset_link && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(task.asset_link!, "_blank");
            }}
            className="h-8 text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Asset
          </Button>
        )}
        {onNotesClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onNotesClick();
            }}
            className="h-8 text-xs"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Notes
          </Button>
        )}
        {userRole === "team_member" && onSubmit && task.status !== "Approved" && (
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSubmit();
            }}
            className="h-8 text-xs ml-auto"
          >
            Submit
          </Button>
        )}
      </div>
    </div>
  );
};
