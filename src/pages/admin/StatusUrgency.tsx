import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { ColorPicker } from "@/components/ColorPicker";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { invalidateStatusUrgencyCache } from "@/hooks/useStatusUrgency";

interface StatusUrgencyItem {
  label: string;
  color: string;
}

interface SortableItemProps {
  item: StatusUrgencyItem;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableItem({ item, isOwner, onEdit, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.label });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-3">
        {isOwner && (
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <Badge className={cn("px-3 py-1", item.color)}>
          {item.label}
        </Badge>
      </div>
      {isOwner && (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

const defaultStatuses: StatusUrgencyItem[] = [
  { label: "Not Started", color: "bg-status-pearl text-status-pearl-foreground" },
  { label: "In Progress", color: "bg-status-sky-blue text-status-sky-blue-foreground" },
  { label: "In Approval", color: "bg-status-buttercup text-status-buttercup-foreground" },
  { label: "Approved", color: "bg-status-mint text-status-mint-foreground" },
  { label: "Revision", color: "bg-status-peach text-status-peach-foreground" },
  { label: "On Hold", color: "bg-status-lavender text-status-lavender-foreground" },
  { label: "Cancelled", color: "bg-status-coral text-status-coral-foreground" },
  { label: "Rejected", color: "bg-status-rose text-status-rose-foreground" },
];

const initialStatuses: StatusUrgencyItem[] = defaultStatuses;

const defaultUrgencies: StatusUrgencyItem[] = [
  { label: "Very Low", color: "bg-urgency-very-low text-urgency-very-low-foreground" },
  { label: "Low", color: "bg-urgency-low text-urgency-low-foreground" },
  { label: "Medium", color: "bg-urgency-medium text-urgency-medium-foreground" },
  { label: "High", color: "bg-urgency-high text-urgency-high-foreground" },
  { label: "Immediate", color: "bg-urgency-immediate text-urgency-immediate-foreground" },
];

const initialUrgencies: StatusUrgencyItem[] = defaultUrgencies;

export default function StatusUrgency() {
  const { userRole } = useOutletContext<{ userRole: string }>();
  const isOwner = userRole === "project_owner";
  
  const [statuses, setStatuses] = useState<StatusUrgencyItem[]>(initialStatuses);
  const [urgencies, setUrgencies] = useState<StatusUrgencyItem[]>(initialUrgencies);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<"status" | "urgency">("status");
  const [editingItem, setEditingItem] = useState<StatusUrgencyItem | null>(null);
  const [formData, setFormData] = useState({ label: "", color: "" });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .in("setting_key", ["task_statuses", "task_urgencies"]);

      if (error) throw error;

      if (data) {
        const statusesSetting = data.find((s) => s.setting_key === "task_statuses");
        const urgenciesSetting = data.find((s) => s.setting_key === "task_urgencies");

        if (statusesSetting) {
          setStatuses(JSON.parse(statusesSetting.setting_value));
        }
        if (urgenciesSetting) {
          setUrgencies(JSON.parse(urgenciesSetting.setting_value));
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const saveStatuses = async (newStatuses: StatusUrgencyItem[]) => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          setting_key: "task_statuses",
          setting_value: JSON.stringify(newStatuses),
      });

      if (error) throw error;
      
      // Invalidate cache to refresh all components
      await invalidateStatusUrgencyCache();
      
      toast.success("Task statuses saved successfully");
    } catch (error: any) {
      console.error("Error saving statuses:", error);
      toast.error(error.message || "Failed to save statuses");
    }
  };

  const saveUrgencies = async (newUrgencies: StatusUrgencyItem[]) => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          setting_key: "task_urgencies",
          setting_value: JSON.stringify(newUrgencies),
        });

      if (error) throw error;
      
      // Invalidate cache to refresh all components
      await invalidateStatusUrgencyCache();
      
      toast.success("Task urgencies saved successfully");
    } catch (error: any) {
      console.error("Error saving urgencies:", error);
      toast.error(error.message || "Failed to save urgencies");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent, type: "status" | "urgency") => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const items = type === "status" ? statuses : urgencies;
      
      const oldIndex = items.findIndex((item) => item.label === active.id);
      const newIndex = items.findIndex((item) => item.label === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      
      if (type === "status") {
        setStatuses(newItems);
        await saveStatuses(newItems);
      } else {
        setUrgencies(newItems);
        await saveUrgencies(newItems);
      }
      
      toast.success(`${type === "status" ? "Status" : "Urgency"} order updated`);
    }
  };

  const handleEdit = (type: "status" | "urgency", item: StatusUrgencyItem) => {
    setEditingType(type);
    setEditingItem(item);
    setFormData({ label: item.label, color: item.color });
    setEditDialogOpen(true);
  };

  const handleAdd = (type: "status" | "urgency") => {
    setEditingType(type);
    setEditingItem(null);
    setFormData({ label: "", color: "" });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.label) {
      toast.error("Please fill in all fields");
      return;
    }

    if (editingItem) {
      // Update existing
      if (editingType === "status") {
        const newStatuses = statuses.map(s => 
          s.label === editingItem.label ? { ...formData } : s
        );
        setStatuses(newStatuses);
        await saveStatuses(newStatuses);
      } else {
        const newUrgencies = urgencies.map(u => 
          u.label === editingItem.label ? { ...formData } : u
        );
        setUrgencies(newUrgencies);
        await saveUrgencies(newUrgencies);
      }
      toast.success(`${editingType === "status" ? "Status" : "Urgency"} updated successfully`);
    } else {
      // Add new
      if (editingType === "status") {
        const newStatuses = [...statuses, formData];
        setStatuses(newStatuses);
        await saveStatuses(newStatuses);
      } else {
        const newUrgencies = [...urgencies, formData];
        setUrgencies(newUrgencies);
        await saveUrgencies(newUrgencies);
      }
      toast.success(`${editingType === "status" ? "Status" : "Urgency"} added successfully`);
    }

    setEditDialogOpen(false);
  };

  const handleDelete = async (type: "status" | "urgency", label: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    if (type === "status") {
      const newStatuses = statuses.filter(s => s.label !== label);
      setStatuses(newStatuses);
      await saveStatuses(newStatuses);
    } else {
      const newUrgencies = urgencies.filter(u => u.label !== label);
      setUrgencies(newUrgencies);
      await saveUrgencies(newUrgencies);
    }
    toast.success(`${type === "status" ? "Status" : "Urgency"} deleted successfully`);
  };

  const handleReset = async (type: "status" | "urgency") => {
    if (!window.confirm(`Are you sure you want to reset ${type === "status" ? "statuses" : "urgencies"} to default values? This will replace all current values.`)) return;

    if (type === "status") {
      setStatuses(defaultStatuses);
      await saveStatuses(defaultStatuses);
    } else {
      setUrgencies(defaultUrgencies);
      await saveUrgencies(defaultUrgencies);
    }
    toast.success(`${type === "status" ? "Statuses" : "Urgencies"} reset to defaults successfully`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Status & Urgency</h2>
        <p className="text-muted-foreground">
          {isOwner ? "Manage UI colors and labels" : "View status and urgency definitions"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Task Statuses</CardTitle>
                <CardDescription>Current status options and their colors</CardDescription>
              </div>
              {isOwner && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleReset("status")}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={() => handleAdd("status")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, "status")}
            >
              <SortableContext
                items={statuses.map((s) => s.label)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {statuses.map((status) => (
                    <SortableItem
                      key={status.label}
                      item={status}
                      isOwner={isOwner}
                      onEdit={() => handleEdit("status", status)}
                      onDelete={() => handleDelete("status", status.label)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Task Urgency</CardTitle>
                <CardDescription>Current urgency levels and their colors</CardDescription>
              </div>
              {isOwner && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleReset("urgency")}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={() => handleAdd("urgency")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, "urgency")}
            >
              <SortableContext
                items={urgencies.map((u) => u.label)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {urgencies.map((urgency) => (
                    <SortableItem
                      key={urgency.label}
                      item={urgency}
                      isOwner={isOwner}
                      onEdit={() => handleEdit("urgency", urgency)}
                      onDelete={() => handleDelete("urgency", urgency.label)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      </div>

      {!isOwner && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Only Project Owners can edit status and urgency configurations
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit" : "Add"} {editingType === "status" ? "Status" : "Urgency"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update" : "Create"} {editingType === "status" ? "status" : "urgency"} details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., In Progress"
              />
            </div>
            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
              type={editingType}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
