import { useState } from "react";
import { useOutletContext } from "react-router-dom";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface StatusUrgencyItem {
  value: string;
  label: string;
  color: string;
}

const initialStatuses: StatusUrgencyItem[] = [
  { value: "To Do", label: "To Do", color: "bg-status-todo text-status-todo-foreground" },
  { value: "Doing", label: "Doing", color: "bg-status-doing text-status-doing-foreground" },
  { value: "Done", label: "Done", color: "bg-status-done text-status-done-foreground" },
  { value: "Approved", label: "Approved", color: "bg-status-approved text-status-approved-foreground" },
  { value: "On Hold", label: "On Hold", color: "bg-status-hold text-status-hold-foreground" },
  { value: "Cancelled", label: "Cancelled", color: "bg-status-cancelled text-status-cancelled-foreground" },
  { value: "Needs Review", label: "Needs Review", color: "bg-status-hold text-status-hold-foreground" },
  { value: "Blocked", label: "Blocked", color: "bg-status-cancelled text-status-cancelled-foreground" },
];

const initialUrgencies: StatusUrgencyItem[] = [
  { value: "Low", label: "Low", color: "bg-urgency-low text-urgency-low-foreground" },
  { value: "Medium", label: "Medium", color: "bg-urgency-medium text-urgency-medium-foreground" },
  { value: "High", label: "High", color: "bg-urgency-high text-urgency-high-foreground" },
  { value: "Immediate", label: "Immediate", color: "bg-urgency-immediate text-urgency-immediate-foreground" },
];

export default function StatusUrgency() {
  const { userRole } = useOutletContext<{ userRole: string }>();
  const isOwner = userRole === "project_owner";
  
  const [statuses, setStatuses] = useState<StatusUrgencyItem[]>(initialStatuses);
  const [urgencies, setUrgencies] = useState<StatusUrgencyItem[]>(initialUrgencies);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<"status" | "urgency">("status");
  const [editingItem, setEditingItem] = useState<StatusUrgencyItem | null>(null);
  const [formData, setFormData] = useState({ value: "", label: "", color: "" });

  const handleEdit = (type: "status" | "urgency", item: StatusUrgencyItem) => {
    setEditingType(type);
    setEditingItem(item);
    setFormData({ value: item.value, label: item.label, color: item.color });
    setEditDialogOpen(true);
  };

  const handleAdd = (type: "status" | "urgency") => {
    setEditingType(type);
    setEditingItem(null);
    setFormData({ value: "", label: "", color: "" });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.label || !formData.value) {
      toast.error("Please fill in all fields");
      return;
    }

    if (editingItem) {
      // Update existing
      if (editingType === "status") {
        setStatuses(statuses.map(s => 
          s.value === editingItem.value ? { ...formData } : s
        ));
      } else {
        setUrgencies(urgencies.map(u => 
          u.value === editingItem.value ? { ...formData } : u
        ));
      }
      toast.success(`${editingType === "status" ? "Status" : "Urgency"} updated successfully`);
    } else {
      // Add new
      if (editingType === "status") {
        setStatuses([...statuses, formData]);
      } else {
        setUrgencies([...urgencies, formData]);
      }
      toast.success(`${editingType === "status" ? "Status" : "Urgency"} added successfully`);
    }

    setEditDialogOpen(false);
  };

  const handleDelete = (type: "status" | "urgency", value: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    if (type === "status") {
      setStatuses(statuses.filter(s => s.value !== value));
    } else {
      setUrgencies(urgencies.filter(u => u.value !== value));
    }
    toast.success(`${type === "status" ? "Status" : "Urgency"} deleted successfully`);
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
                <Button size="sm" onClick={() => handleAdd("status")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statuses.map((status) => (
                <div key={status.value} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <span className="font-medium">{status.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={status.color}>{status.value}</Badge>
                    {isOwner && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit("status", status)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDelete("status", status.value)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                <Button size="sm" onClick={() => handleAdd("urgency")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgencies.map((urgency) => (
                <div key={urgency.value} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <span className="font-medium">{urgency.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={urgency.color}>{urgency.value}</Badge>
                    {isOwner && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit("urgency", urgency)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDelete("urgency", urgency.value)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
              <Label>Value</Label>
              <Input
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., In Progress"
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., In Progress"
              />
            </div>
            <div>
              <Label>Color Class</Label>
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="e.g., bg-blue-100 text-blue-800"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use semantic tokens like bg-status-doing text-status-doing-foreground
              </p>
            </div>
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
