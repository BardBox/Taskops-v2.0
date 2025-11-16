import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Edit, FileText, Upload, Calendar, User } from "lucide-react";
import { BadgeDropdown } from "./BadgeDropdown";
import { useGamification } from "@/hooks/useGamification";
import { GamificationStats } from "./GamificationStats";
import { playNotificationSound } from "@/utils/notificationSounds";
import { triggerSparkles } from "@/utils/celebrationEffects";

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

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

  const getStickyNoteColor = (urgency: string) => {
    const urgencyLower = urgency.toLowerCase();
    if (urgencyLower.includes('high') || urgencyLower.includes('urgent') || urgencyLower.includes('critical')) {
      // Solid vibrant orange sticky note for urgent
      return 'bg-[#ffb366] border-[#ff9944]';
    }
    if (urgencyLower.includes('medium') || urgencyLower.includes('moderate')) {
      // Solid vibrant blue sticky note for medium
      return 'bg-[#a8d8ff] border-[#88c8ff]';
    }
    // Solid vibrant yellow sticky note for low (default)
    return 'bg-[#ffff88] border-[#ffff55]';
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
        className={`p-4 mb-3 cursor-pointer transition-all group relative ${randomRotation} ${getStickyNoteColor(task.urgency)} border-2 overflow-hidden shadow-lg hover:shadow-2xl ${isOverdue ? 'ring-2 ring-red-500/50 animate-pulse' : ''} ${isFresh ? 'ring-2 ring-yellow-400/50' : ''}`}
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
        {/* Page curl effect on hover - bottom right corner only */}
        <div 
          className="absolute bottom-0 right-0 w-0 h-0 transition-all duration-300 group-hover:w-8 group-hover:h-8 opacity-0 group-hover:opacity-100" 
          style={{
            borderLeft: '32px solid transparent',
            borderBottom: '32px solid rgba(0,0,0,0.15)',
            filter: 'drop-shadow(-1px -1px 2px rgba(0,0,0,0.2))',
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
                <h4 className="font-semibold text-sm mb-1 line-clamp-2">{task.task_name}</h4>
                {task.clients && (
                  <p className="text-xs text-muted-foreground">{task.clients.name}</p>
                )}
                {task.projects && (
                  <p className="text-xs text-muted-foreground">{task.projects.name}</p>
                )}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <BadgeDropdown
                value={task.urgency}
                options={urgencies}
                onChange={(value) => onUrgencyChange(task.id, value)}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {task.assignee && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.assignee.full_name}
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
    const newStatus = over.id as string;
    
    const task = tasks.find(t => t.id === taskId);
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
      <div 
        ref={setNodeRef} 
        className={`flex-shrink-0 w-80 transition-all ${isOver ? 'ring-2 ring-primary scale-105' : ''}`}
      >
        <div 
          className="rounded-lg p-4 h-full bg-gray-100 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700"
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
          {children}
        </div>
      </div>
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
        collisionDetection={closestCorners}
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
                <AnimatePresence>
                  <div className="space-y-2 min-h-[200px]">
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
                        onUrgencyChange={onUrgencyChange}
                        onAppreciationToggle={onAppreciationToggle}
                        onSubmit={onSubmit}
                        onNotesClick={onNotesClick}
                        canEdit={canEdit(task)}
                      />
                    ))}
                  </div>
                </AnimatePresence>
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
