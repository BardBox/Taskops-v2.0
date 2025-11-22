import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Smile, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StatusMoodSelectorProps {
  userId: string;
  currentStatus?: string | null;
  currentMood?: string | null;
  onUpdate?: () => void;
}

export function StatusMoodSelector({
  userId,
  currentStatus,
  currentMood,
  onUpdate,
}: StatusMoodSelectorProps) {
  const [statuses, setStatuses] = useState<string[]>([
    "Available",
    "Busy",
    "Out of Office",
    "Do Not Disturb",
    "On Leave",
  ]);
  const [moods, setMoods] = useState<string[]>([
    "😊 Happy",
    "😎 Cool",
    "🤔 Thoughtful",
    "😴 Tired",
    "🔥 On Fire",
    "🎯 Focused",
    "🎉 Excited",
    "😌 Relaxed",
    "💪 Motivated",
    "🤯 Overwhelmed",
  ]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(
    currentStatus || null
  );
  const [selectedMood, setSelectedMood] = useState<string | null>(
    currentMood || null
  );
  const [statusOpen, setStatusOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    setSelectedStatus(currentStatus || null);
    setSelectedMood(currentMood || null);
  }, [currentStatus, currentMood]);

  const fetchOptions = async () => {
    try {
      const { data: settings } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["status_options", "mood_options"]);

      if (settings) {
        settings.forEach((setting) => {
          if (setting.setting_key === "status_options") {
            setStatuses(JSON.parse(setting.setting_value));
          } else if (setting.setting_key === "mood_options") {
            setMoods(JSON.parse(setting.setting_value));
          }
        });
      }
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", userId);

      if (error) throw error;
      setSelectedStatus(status);
      setStatusOpen(false);
      toast.success(`Status updated to ${status}`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const updateMood = async (mood: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ mood })
        .eq("id", userId);

      if (error) throw error;
      setSelectedMood(mood);
      setMoodOpen(false);
      toast.success("Mood updated");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating mood:", error);
      toast.error("Failed to update mood");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/50 hover:bg-green-500/20";
      case "Busy":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/50 hover:bg-red-500/20";
      case "Out of Office":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/50 hover:bg-orange-500/20";
      case "Do Not Disturb":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/50 hover:bg-purple-500/20";
      case "On Leave":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/50 hover:bg-gray-500/20";
      default:
        return "bg-muted hover:bg-muted/80";
    }
  };

  const getStatusDotColor = (status: string | null) => {
    if (!status) return "bg-gray-500";
    switch (status) {
      case "Available":
        return "bg-green-500";
      case "Busy":
        return "bg-red-500";
      case "Out of Office":
        return "bg-orange-500";
      case "Do Not Disturb":
        return "bg-purple-500";
      case "On Leave":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="border-l-4 border-l-primary shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Status & Mood</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <Activity className="h-3.5 w-3.5" />
            <span>Status</span>
          </div>
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start gap-2",
                  selectedStatus && getStatusColor(selectedStatus)
                )}
              >
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    getStatusDotColor(selectedStatus)
                  )}
                />
                {selectedStatus || "Set status"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-background border shadow-lg z-50" align="start">
              <div className="space-y-1">
                {statuses.map((status) => (
                  <Button
                    key={status}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2",
                      selectedStatus === status && "bg-accent"
                    )}
                    onClick={() => updateStatus(status)}
                  >
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        getStatusDotColor(status)
                      )}
                    />
                    {status}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Mood Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <Smile className="h-3.5 w-3.5" />
            <span>Mood</span>
          </div>
          <Popover open={moodOpen} onOpenChange={setMoodOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-base"
              >
                {selectedMood || "Set mood"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-background border shadow-lg z-50" align="start">
              <div className="grid grid-cols-2 gap-1">
                {moods.map((mood) => (
                  <Button
                    key={mood}
                    variant="ghost"
                    className={cn(
                      "justify-start text-sm h-auto py-2",
                      selectedMood === mood && "bg-accent"
                    )}
                    onClick={() => updateMood(mood)}
                  >
                    {mood}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Current Display */}
        {(selectedStatus || selectedMood) && (
          <div className="pt-2 border-t flex flex-wrap gap-2">
            {selectedStatus && (
              <Badge
                variant="outline"
                className={getStatusColor(selectedStatus)}
              >
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full mr-1.5",
                    getStatusDotColor(selectedStatus)
                  )}
                />
                {selectedStatus}
              </Badge>
            )}
            {selectedMood && (
              <Badge variant="outline" className="text-base">
                {selectedMood}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
