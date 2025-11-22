import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DashboardPreferences {
  showMetrics: boolean;
  showFilters: boolean;
  showQuickFilters: boolean;
  visibleColumns: {
    date: boolean;
    client: boolean;
    project: boolean;
    taskOwner: boolean;
    pm: boolean;
    deadline: boolean;
    submission: boolean;
    delay: boolean;
    collaborators: boolean;
    status: boolean;
    urgency: boolean;
  };
}

interface DashboardCustomizationProps {
  userId: string;
  preferences: DashboardPreferences;
  onPreferencesChange: (preferences: DashboardPreferences) => void;
}

export const DashboardCustomization = ({
  userId,
  preferences,
  onPreferencesChange,
}: DashboardCustomizationProps) => {
  const [open, setOpen] = useState(false);
  const [localPreferences, setLocalPreferences] = useState(preferences);

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handleSave = async () => {
    try {
      // Save to database
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: userId,
          show_metrics: localPreferences.showMetrics,
          show_filters: localPreferences.showFilters,
          dashboard_view: JSON.stringify({
            showQuickFilters: localPreferences.showQuickFilters,
            visibleColumns: localPreferences.visibleColumns,
          }),
        });

      if (error) throw error;

      onPreferencesChange(localPreferences);
      toast.success("Dashboard preferences saved");
      setOpen(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    }
  };

  const toggleComponent = (key: keyof Omit<DashboardPreferences, 'visibleColumns'>) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleColumn = (column: keyof DashboardPreferences['visibleColumns']) => {
    setLocalPreferences(prev => ({
      ...prev,
      visibleColumns: {
        ...prev.visibleColumns,
        [column]: !prev.visibleColumns[column],
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dashboard Customization</DialogTitle>
          <DialogDescription>
            Customize which components and columns to display on your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dashboard Components */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Dashboard Components</h4>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="metrics"
                checked={localPreferences.showMetrics}
                onCheckedChange={() => toggleComponent('showMetrics')}
              />
              <Label htmlFor="metrics" className="cursor-pointer">
                Status Cards
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="filters"
                checked={localPreferences.showFilters}
                onCheckedChange={() => toggleComponent('showFilters')}
              />
              <Label htmlFor="filters" className="cursor-pointer">
                View Filters
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="quickFilters"
                checked={localPreferences.showQuickFilters}
                onCheckedChange={() => toggleComponent('showQuickFilters')}
              />
              <Label htmlFor="quickFilters" className="cursor-pointer">
                Quick Filters
              </Label>
            </div>
          </div>

          <Separator />

          {/* Task Table Columns */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Task Table Columns</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="date"
                  checked={localPreferences.visibleColumns.date}
                  onCheckedChange={() => toggleColumn('date')}
                />
                <Label htmlFor="date" className="cursor-pointer text-sm">
                  Date
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="client"
                  checked={localPreferences.visibleColumns.client}
                  onCheckedChange={() => toggleColumn('client')}
                />
                <Label htmlFor="client" className="cursor-pointer text-sm">
                  Client
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="project"
                  checked={localPreferences.visibleColumns.project}
                  onCheckedChange={() => toggleColumn('project')}
                />
                <Label htmlFor="project" className="cursor-pointer text-sm">
                  Project
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="taskOwner"
                  checked={localPreferences.visibleColumns.taskOwner}
                  onCheckedChange={() => toggleColumn('taskOwner')}
                />
                <Label htmlFor="taskOwner" className="cursor-pointer text-sm">
                  Task Owner
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pm"
                  checked={localPreferences.visibleColumns.pm}
                  onCheckedChange={() => toggleColumn('pm')}
                />
                <Label htmlFor="pm" className="cursor-pointer text-sm">
                  PM
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deadline"
                  checked={localPreferences.visibleColumns.deadline}
                  onCheckedChange={() => toggleColumn('deadline')}
                />
                <Label htmlFor="deadline" className="cursor-pointer text-sm">
                  Deadline
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="submission"
                  checked={localPreferences.visibleColumns.submission}
                  onCheckedChange={() => toggleColumn('submission')}
                />
                <Label htmlFor="submission" className="cursor-pointer text-sm">
                  Submission
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delay"
                  checked={localPreferences.visibleColumns.delay}
                  onCheckedChange={() => toggleColumn('delay')}
                />
                <Label htmlFor="delay" className="cursor-pointer text-sm">
                  Delay
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="collaborators"
                  checked={localPreferences.visibleColumns.collaborators}
                  onCheckedChange={() => toggleColumn('collaborators')}
                />
                <Label htmlFor="collaborators" className="cursor-pointer text-sm">
                  Collaborators
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="status"
                  checked={localPreferences.visibleColumns.status}
                  onCheckedChange={() => toggleColumn('status')}
                />
                <Label htmlFor="status" className="cursor-pointer text-sm">
                  Status
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="urgency"
                  checked={localPreferences.visibleColumns.urgency}
                  onCheckedChange={() => toggleColumn('urgency')}
                />
                <Label htmlFor="urgency" className="cursor-pointer text-sm">
                  Urgency
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
