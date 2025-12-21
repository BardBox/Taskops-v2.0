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
import { Paperclip, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [submissionType, setSubmissionType] = useState<"link" | "file">("link");
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("File must be less than 50MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `submission-${taskId}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("task-references") // Reusing this bucket for now
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("task-references")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalAssetLink = formData.asset_link;

      if (submissionType === "file") {
        if (!file) {
          toast.error("Please select a file to upload");
          setLoading(false);
          return;
        }

        const uploadedUrl = await uploadFile(file);
        if (!uploadedUrl) {
          throw new Error("Failed to upload file");
        }
        finalAssetLink = uploadedUrl;
      } else if (!finalAssetLink) {
        toast.error("Asset link is required");
        setLoading(false);
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
          asset_link: finalAssetLink,
        })
        .eq("id", taskId);

      if (error) throw error;

      // Track asset link change in history if it changed
      if (oldAssetLink !== finalAssetLink) {
        const { error: historyError } = await supabase
          .from("task_edit_history")
          .insert({
            task_id: taskId,
            edited_by_id: user.id,
            field_name: "asset_link",
            old_value: oldAssetLink || "(empty)",
            new_value: finalAssetLink,
            change_description: submissionType === "file"
              ? "Asset file uploaded"
              : "Asset link updated",
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
      setFile(null);
      setSubmissionType("link");
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
            Enter the submission date and provide the asset
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
            <Label>Submission Type</Label>
            <Tabs value={submissionType} onValueChange={(v: string) => setSubmissionType(v as "link" | "file")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link">Link URL</TabsTrigger>
                <TabsTrigger value="file">Upload File</TabsTrigger>
              </TabsList>

              <TabsContent value="link" className="pt-2">
                <Input
                  id="asset_link"
                  type="url"
                  value={formData.asset_link}
                  onChange={(e) => setFormData({ ...formData, asset_link: e.target.value })}
                  placeholder="https://..."
                  required={submissionType === "link"}
                />
              </TabsContent>

              <TabsContent value="file" className="pt-2">
                {!file ? (
                  <div className="relative">
                    <Input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="submit-file-upload"
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    />
                    <Label
                      htmlFor="submit-file-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Paperclip className="h-8 w-8 mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">Click to upload file</p>
                      <p className="text-xs text-muted-foreground mt-1">Max 50MB</p>
                    </Label>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 border rounded-md bg-muted">
                    <Paperclip className="h-5 w-5 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
