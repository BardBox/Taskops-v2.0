import { useState, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, pointerWithin, rectIntersection, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Edit, FileText, Upload, Calendar, User, Lock } from "lucide-react";
import { BadgeDropdown } from "./BadgeDropdown";
import { useGamification } from "@/hooks/useGamification";
import { GamificationStats } from "./GamificationStats";
import { playNotificationSound } from "@/utils/notificationSounds";
import { canChangeUrgency, canTeamMemberChangeStatus } from "@/utils/roleHelpers";
import { toast } from "sonner";

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
  revision_count: number;
  revision_requested_at: string | null;
  revision_requested_by: string | null;
  clients: { name: string } | null;
  projects: { name: string } | null;
  assignee: { full_name: string } | null;
  assigned_by: { full_name: string } | null;
  collaborators?: Array<{ user_id: string; profiles: { full_name: string; avatar_url: string | null } }>;
}

interface KanbanBoardProps {
  tasks: Task[];
  userRole: string;
  userId: string;
  statuses: { label: string; color: string }[];
  urgencies: { label: string; color: string }[];
  selectedTaskIds: Set<string>;
  taskAppreciations: Map<string, boolean>;
  onTaskClick: (taskId: string) => void;
  onSelectTask: (taskId: string, checked: boolean) => void;
  onEditTask: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onUrgencyChange: (taskId: string, newUrgency: string) => void;
  onAppreciationToggle: (taskId: string, e: React.MouseEvent) => void;
  onSubmit: (task: Task) => void;
  onNotesClick: (task: Task) => void;
}

const SortableTaskCard = ({ 
  task, 
  userRole, 
  userId,
  isSelected,
  isAppreciated,
  urgencies,
  onSelect,
  onEdit,
  onClick,
  onUrgencyChange,
  onAppreciationToggle,
  onSubmit,
  onNotesClick,
  canEdit
}: any) => {
  // Enable dragging based on user permissions
  const isDragDisabled = !canEdit || (userRole === "team_member" && !canTeamMemberChangeStatus(task.status));
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: task.id,
    disabled: isDragDisabled
  });

  const rotations = ['rotate-[-1deg]', 'rotate-[0.5deg]', 'rotate-[-0.5deg]', 'rotate-[1deg]'];
  const randomRotation = rotations[Math.floor(Math.random() * rotations.length)];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getUrgencyColor = (urgency: string) => {
    const urgencyItem = urgencies.find((u: any) => u.label === urgency);
    return urgencyItem?.color || "bg-muted text-muted-foreground";
  };

  const getStatusColor = (status: string) => {
    const statusItem = [
      { label: "Not Started", color: "bg-status-1" },
      { label: "In Progress", color: "bg-status-2" },
      { label: "In Approval", color: "bg-status-3" },
      { label: "Approved", color: "bg-status-4" },
      { label: "On Hold", color: "bg-status-6" },
      { label: "Cancelled", color: "bg-status-7" },
      { label: "Rejected", color: "bg-status-8" }
    ].find((s: any) => s.label === status);
    return statusItem?.color || "bg-muted text-muted-foreground";
  };

  const getStickyNoteColor = (urgency: string) => {
    const urgencyItem = urgencies.find((u: any) => u.label === urgency);
    if (!urgencyItem) return 'bg-[hsl(50,40%,96%)] border-[hsl(50,40%,88%)]'; // default soft yellow
    
    // Extract urgency level number from color class (e.g., "bg-urgency-15" -> 15)
    const colorMatch = urgencyItem.color.match(/urgency-(\d+)/);
    if (!colorMatch) return 'bg-[hsl(50,40%,96%)] border-[hsl(50,40%,88%)]';
    
    const level = parseInt(colorMatch[1]);
    
    // Map urgency levels to very light, desaturated sticky note colors
    // Lower levels (1-7): Cool blues/cyans - very light and desaturated
    // Mid levels (8-13): Warm yellows/oranges - very light and desaturated
    // High levels (14-20): Warm oranges/reds - very light and desaturated
    const colorMap: { [key: number]: string } = {
      1: 'bg-[hsl(200,35%,96%)] border-[hsl(200,35%,88%)]',
      2: 'bg-[hsl(195,34%,96%)] border-[hsl(195,34%,88%)]',
      3: 'bg-[hsl(190,33%,96%)] border-[hsl(190,33%,88%)]',
      4: 'bg-[hsl(185,32%,96%)] border-[hsl(185,32%,88%)]',
      5: 'bg-[hsl(180,31%,96%)] border-[hsl(180,31%,88%)]',
      6: 'bg-[hsl(175,30%,96%)] border-[hsl(175,30%,88%)]',
      7: 'bg-[hsl(170,29%,96%)] border-[hsl(170,29%,88%)]',
      8: 'bg-[hsl(60,40%,96%)] border-[hsl(60,40%,88%)]',
      9: 'bg-[hsl(55,41%,96%)] border-[hsl(55,41%,88%)]',
      10: 'bg-[hsl(50,42%,96%)] border-[hsl(50,42%,88%)]',
      11: 'bg-[hsl(45,43%,96%)] border-[hsl(45,43%,88%)]',
      12: 'bg-[hsl(40,44%,96%)] border-[hsl(40,44%,88%)]',
      13: 'bg-[hsl(35,45%,96%)] border-[hsl(35,45%,88%)]',
      14: 'bg-[hsl(30,46%,96%)] border-[hsl(30,46%,88%)]',
      15: 'bg-[hsl(25,47%,96%)] border-[hsl(25,47%,88%)]',
      16: 'bg-[hsl(20,48%,96%)] border-[hsl(20,48%,88%)]',
      17: 'bg-[hsl(15,49%,96%)] border-[hsl(15,49%,88%)]',
      18: 'bg-[hsl(10,50%,96%)] border-[hsl(10,50%,88%)]',
      19: 'bg-[hsl(5,51%,96%)] border-[hsl(5,51%,88%)]',
      20: 'bg-[hsl(0,52%,96%)] border-[hsl(0,52%,88%)]'
    };
    
    return colorMap[level] || 'bg-[hsl(50,40%,96%)] border-[hsl(50,40%,88%)]';
  };

  // Check if task is overdue
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Completed';
  
  // Check if task is fresh (created within last hour)
  const isFresh = new Date().getTime() - new Date(task.date).getTime() < 3600000;

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ 
        scale: 1.05, 
        rotate: 0,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={`p-4 mb-3 transition-all group relative ${randomRotation} ${getStickyNoteColor(task.urgency)} border-2 overflow-hidden shadow-lg hover:shadow-2xl ${isOverdue ? 'ring-2 ring-red-500/50' : ''} ${isFresh ? 'ring-2 ring-yellow-400/50' : ''} ${isDragDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 24px,
            rgba(0,0,0,0.03) 24px,
            rgba(0,0,0,0.03) 25px
          )`,
          boxShadow: '0 4px 6px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
        onClick={() => onClick(task.id)}
      >
        {/* Lock icon for non-draggable tasks (team members only) */}
        {isDragDisabled && userRole === "team_member" && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {/* Page curl effect on bottom-right corner - realistic with shadow */}
        <div 
          className="absolute bottom-0 right-0 w-0 h-0 group-hover:w-14 group-hover:h-14 pointer-events-none transition-all duration-300 ease-out"
          style={{
            background: 'linear-gradient(135deg, transparent 45%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.15) 55%, rgba(255,255,255,0.1) 100%)',
            borderRadius: '0 0 4px 0',
            boxShadow: '-2px -2px 5px rgba(0,0,0,0.2), -1px -1px 3px rgba(0,0,0,0.15), inset 1px 1px 2px rgba(255,255,255,0.4)',
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          }}
        />
        
        {/* Task content - NO PIN ELEMENTS */}
        <div className="space-y-3 pt-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              {userRole === "project_owner" && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(task.id, checked)}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm line-clamp-2 flex-1">{task.task_name}</h4>
                  {task.revision_count > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0">
                      Rev {task.revision_count}
                    </Badge>
                  )}
                </div>
                {task.clients && (
                  <p className="text-xs text-muted-foreground">{task.clients.name}</p>
                )}
                {task.projects && (
                  <p className="text-xs text-muted-foreground">{task.projects.name}</p>
                )}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              {userRole === "team_member" ? (
                <Badge className={getUrgencyColor(task.urgency)}>
                  {task.urgency}
                </Badge>
              ) : (
                <BadgeDropdown
                  value={task.urgency}
                  options={urgencies}
                  onChange={(value) => onUrgencyChange(task.id, value)}
                  disabled={!canEdit}
                  variant="text"
                />
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {task.assignee && (
              <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{task.assignee.full_name}</span>
          </div>
            )}
            {/* Show collaborators in Kanban */}
            {task.collaborators && task.collaborators.length > 0 && (
              <div className="flex items-center gap-1 text-xs flex-wrap">
                <span className="text-muted-foreground">+</span>
                {task.collaborators.map((c: any, idx: number) => (
                <span key={idx} className="flex items-center gap-0.5">
                  {c.profiles?.full_name || "?"}
                  {idx < task.collaborators.length - 1 && <span>,</span>}
                </span>
                ))}
              </div>
            )}
            {task.deadline && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(task.deadline).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {userRole !== "project_manager" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => onAppreciationToggle(task.id, e)}
                className="h-7 w-7 p-0"
              >
                <Star className={`h-3 w-3 ${isAppreciated ? "fill-yellow-400 text-yellow-400" : ""}`} />
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="h-7 w-7 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNotesClick(task);
              }}
              className="h-7 w-7 p-0"
            >
              <FileText className="h-3 w-3" />
            </Button>
            {task.assignee_id === userId && task.status !== "Approved" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSubmit(task);
                }}
                className="h-7 w-7 p-0"
              >
                <Upload className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Custom collision detection that works with empty columns
const customCollisionDetection = (args: any) => {
  // First, try to find collisions with pointer within droppable areas
  const pointerCollisions = pointerWithin(args);
  
  // If we found collisions with pointerWithin, use those
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  
  // Otherwise, fall back to rectangle intersection
  return rectIntersection(args);
};

export const KanbanBoard = ({
  tasks,
  userRole,
  userId,
  statuses,
  urgencies,
  selectedTaskIds,
  taskAppreciations,
  onTaskClick,
  onSelectTask,
  onEditTask,
  onStatusChange,
  onUrgencyChange,
  onAppreciationToggle,
  onSubmit,
  onNotesClick,
}: KanbanBoardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Map<string, string>>(new Map());
  
  // Initialize gamification hook
  const { stats, onTaskCompleted } = useGamification(userId);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const canEdit = (task: Task) => {
    if (userRole === "project_owner") return true;
    if (userRole === "project_manager") return true;
    if (userRole === "team_member" && task.assignee_id === userId) {
      return task.status !== "Approved";
    }
    return false;
  };

  const handleUrgencyChange = (taskId: string, newUrgency: string) => {
    if (userRole === "team_member") return; // TMs can't change urgency
    onUrgencyChange(taskId, newUrgency);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    playNotificationSound('peel', 0.5);
    playNotificationSound('whoosh', 0.3);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    
    // Check if we dropped on a task or a column
    // If over.id matches a task ID, use that task's status as the new status
    const overTask = tasks.find(t => t.id === over.id);
    const newStatus = overTask ? overTask.status : (over.id as string);
    
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      console.error("Task not found:", taskId);
      setActiveId(null);
      return;
    }
    
    console.log("Drag attempt - over.id:", over.id, "newStatus:", newStatus, "userRole:", userRole);
    
    // Check if team member can make this status change
    if (userRole === "team_member") {
      const allowedStatuses = ["Not Started", "In Progress", "In Approval"];
      
      console.log("TM validation:", {
        taskAssignedTo: task.assignee_id,
        currentUserId: userId,
        currentStatus: task.status,
        targetStatus: newStatus,
        isAllowedStatus: allowedStatuses.includes(newStatus),
        canChangeFromCurrent: canTeamMemberChangeStatus(task.status)
      });
      
      // Check if task is assigned to this user
      if (task.assignee_id !== userId) {
        toast.error("You can only move tasks assigned to you");
        setActiveId(null);
        return;
      }
      
      // If current status is restricted, prevent any changes
      if (!canTeamMemberChangeStatus(task.status)) {
        toast.error("You cannot change this task's status");
        setActiveId(null);
        return;
      }
      
      // Only allow dropping to allowed statuses
      if (!allowedStatuses.includes(newStatus)) {
        toast.error("You can only move tasks to: Not Started, In Progress, or In Approval");
        setActiveId(null);
        return;
      }
      
      // If all TM validations pass, make the change
      if (task.status !== newStatus) {
        onStatusChange(taskId, newStatus);
        playNotificationSound('slap', 0.6);
        
        // Check if task was completed
        if (newStatus.toLowerCase() === 'completed' || newStatus.toLowerCase() === 'done' || newStatus.toLowerCase() === 'approved') {
          onTaskCompleted({
            urgency: task.urgency,
            deadline: task.deadline,
            created_at: task.date,
          });
        }
      }
      setActiveId(null);
      return; // Exit early for team members
    }
    
    // For PM and PO, use the canEdit check
    if (task && task.status !== newStatus && canEdit(task)) {
      onStatusChange(taskId, newStatus);
      playNotificationSound('slap', 0.6);
      
      // Check if task was completed and trigger gamification
      if (newStatus.toLowerCase() === 'completed' || newStatus.toLowerCase() === 'done' || newStatus.toLowerCase() === 'approved') {
        onTaskCompleted({
          urgency: task.urgency,
          deadline: task.deadline,
          created_at: task.date,
        });
      }
    } else if (task && task.status === newStatus) {
      console.log("Same status, no change needed");
    } else if (task && !canEdit(task)) {
      console.error("Cannot edit task - canEdit returned false");
      toast.error("You cannot edit this task");
    }

    setActiveId(null);
  };

  const tasksByStatus = statuses.reduce((acc, status) => {
    acc[status.label] = tasks.filter(task => task.status === status.label);
    return acc;
  }, {} as Record<string, Task[]>);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const DroppableColumn = ({ status, children }: { status: { label: string; color: string }; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: status.label });
    
    return (
      <motion.div 
        className="flex-shrink-0 w-80"
        animate={{
          scale: isOver ? 1.02 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div 
          className="rounded-lg p-4 h-full bg-muted/30 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <div className={`w-3 h-3 rounded-full ${status.color}`} />
              {status.label}
            </h3>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              <Badge variant="secondary" className="text-xs font-bold">
                {tasksByStatus[status.label]?.length || 0}
              </Badge>
            </motion.div>
          </div>
          <div ref={setNodeRef} className="flex-1 min-h-[500px]">
            {children}
            {/* Placeholder for empty columns to ensure droppable area is detectable */}
            {tasksByStatus[status.label]?.length === 0 && (
              <div className="h-full min-h-[200px] flex items-center justify-center text-muted-foreground/50 text-sm border-2 border-dashed border-muted-foreground/20 rounded-lg">
                Drop tasks here
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Gamification Stats */}
      <GamificationStats 
        points={stats.points}
        currentStreak={stats.currentStreak}
        completedToday={stats.completedToday}
        achievements={stats.achievements}
      />
      
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 animate-fade-in">
          {statuses.map((status) => (
            <DroppableColumn key={status.label} status={status}>
              <SortableContext
                items={tasksByStatus[status.label]?.map(t => t.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 h-full">
                  {tasksByStatus[status.label]?.map((task) => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      userRole={userRole}
                      userId={userId}
                      isSelected={selectedTaskIds.has(task.id)}
                      isAppreciated={taskAppreciations.get(task.id)}
                      urgencies={urgencies}
                      onSelect={onSelectTask}
                      onEdit={onEditTask}
                      onClick={onTaskClick}
                      onUrgencyChange={handleUrgencyChange}
                      onAppreciationToggle={onAppreciationToggle}
                      onSubmit={onSubmit}
                      onNotesClick={onNotesClick}
                      canEdit={canEdit(task)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DroppableColumn>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <motion.div
              initial={{ scale: 1.05, rotate: 5 }}
              animate={{ scale: 1.1, rotate: 8 }}
            >
              <Card className="p-4 w-80 shadow-2xl opacity-90 bg-primary/10">
                <h4 className="font-semibold text-sm">{activeTask.task_name}</h4>
              </Card>
            </motion.div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
