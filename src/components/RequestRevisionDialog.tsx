import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileEdit, Paperclip, X } from "lucide-react";

interface RequestRevisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  revisionCount: number;
  onRevisionRequested: () => void;
}

export function RequestRevisionDialog({
  open,
  onOpenChange,
  taskId,
  revisionCount,
  onRevisionRequested,
}: RequestRevisionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error("File must be less than 50MB");
        return;
      }
      setReferenceImage(file);

      // Create preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview("");
      }
    }
  };

  const uploadReferenceFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `revision-${taskId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("task-references")
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("task-references")
        .getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload reference file");
      return null;
    }
  };

  const handleRequestRevision = async () => {
    if (!comment.trim()) {
      toast.error("Please provide a comment for the revision");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let imageUrl = null;
      if (referenceImage) {
        imageUrl = await uploadReferenceFile(referenceImage);
      }

      const { error } = await supabase
        .from("tasks")
        .update({
          revision_count: revisionCount + 1,
          revision_requested_at: new Date().toISOString(),
          revision_requested_by: user.id,
          revision_comment: comment,
          revision_reference_link: referenceLink || null,
          revision_reference_image: imageUrl,
          status: "In Progress", // Set back to In Progress for revision
        })
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Revision requested successfully");

      // Reset form
      setComment("");
      setReferenceLink("");
      setReferenceImage(null);
      setImagePreview("");

      onOpenChange(false);
      onRevisionRequested();
    } catch (error: any) {
      console.error("Error requesting revision:", error);
      toast.error(error.message || "Failed to request revision");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Request Revision
          </DialogTitle>
          <DialogDescription>
            Provide feedback and references for the revision. A comment is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="revision-comment">Comment *</Label>
            <Textarea
              id="revision-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Explain what needs to be changed or improved..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="revision-link">Reference Link (Optional)</Label>
            <Input
              id="revision-link"
              type="url"
              value={referenceLink}
              onChange={(e) => setReferenceLink(e.target.value)}
              placeholder="https://example.com/reference"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="revision-file">Reference File (Optional)</Label>
            {!imagePreview && !referenceImage ? (
              <div className="relative">
                <Input
                  id="revision-file"
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Label
                  htmlFor="revision-file"
                  className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Paperclip className="h-5 w-5 mb-1 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Add Image, Video or Doc</span>
                  <span className="text-[10px] text-muted-foreground">Max 50MB</span>
                </Label>
              </div>
            ) : (
              <div className="relative mt-2 inline-block group">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Review reference"
                    className="max-w-xs max-h-40 rounded-lg border shadow-sm aspect-video object-cover"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted max-w-xs">
                    <Paperclip className="h-5 w-5 text-blue-500" />
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium truncate max-w-[180px]">
                        {referenceImage?.name || "Attached File"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {referenceImage ? `${(referenceImage.size / 1024 / 1024).toFixed(2)} MB` : "File attached"}
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 p-1"
                  onClick={() => {
                    setReferenceImage(null);
                    setImagePreview("");
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRequestRevision} disabled={loading || !comment.trim()}>
            {loading ? "Requesting..." : "Request Revision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
