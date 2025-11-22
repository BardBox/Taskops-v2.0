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
import { FileEdit } from "lucide-react";

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadReferenceImage = async (file: File): Promise<string | null> => {
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
      toast.error("Failed to upload reference image");
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
        imageUrl = await uploadReferenceImage(referenceImage);
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
            <Label htmlFor="revision-image">Reference Image (Optional)</Label>
            <Input
              id="revision-image"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Revision reference"
                  className="max-w-xs max-h-40 rounded border"
                />
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
