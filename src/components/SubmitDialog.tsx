import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  existingAssetLink?: string | null;
  onSuccess?: () => void;
}

export const SubmitDialog = ({ open, onOpenChange, taskId, existingAssetLink, onSuccess }: SubmitDialogProps) => {
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    actual_delivery: today,
    asset_link: existingAssetLink || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.asset_link) {
        toast.error("Asset link is required");
        return;
      }

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Fetch current task to get old asset_link
      const { data: currentTask, error: fetchError } = await supabase
        .from("tasks")
        .select("asset_link")
        .eq("id", taskId)
        .single();

      if (fetchError) throw fetchError;

      const oldAssetLink = currentTask?.asset_link;

      // Update the task
      const { error } = await supabase
        .from("tasks")
        .update({
          actual_delivery: formData.actual_delivery,
          asset_link: formData.asset_link,
        })
        .eq("id", taskId);

      if (error) throw error;

      // Track asset link change in history if it changed
      if (oldAssetLink !== formData.asset_link) {
        const { error: historyError } = await supabase
          .from("task_edit_history")
          .insert({
            task_id: taskId,
            edited_by_id: user.id,
            field_name: "asset_link",
            old_value: oldAssetLink || "(empty)",
            new_value: formData.asset_link,
            change_description: oldAssetLink 
              ? "Asset link updated" 
              : "Asset link added",
          });

        if (historyError) {
          console.error("Failed to log asset link history:", historyError);
        }
      }

      toast.success("Task submitted successfully!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
      
      // Reset form
      setFormData({
        actual_delivery: today,
        asset_link: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to submit task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Task</DialogTitle>
          <DialogDescription>
            Enter the submission date and asset link
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="actual_delivery">Submission Date *</Label>
            <Input
              id="actual_delivery"
              type="date"
              value={formData.actual_delivery}
              onChange={(e) => setFormData({ ...formData, actual_delivery: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset_link">Asset Link *</Label>
            <Input
              id="asset_link"
              type="url"
              value={formData.asset_link}
              onChange={(e) => setFormData({ ...formData, asset_link: e.target.value })}
              placeholder="https://..."
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
