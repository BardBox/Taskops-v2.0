import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  onLinkAdded: () => void;
}

export function AddLinkDialog({
  open,
  onOpenChange,
  boardId,
  onLinkAdded,
}: AddLinkDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    setLoading(true);

    const { error } = await supabase.from("link_items").insert({
      board_id: boardId,
      url: url.trim(),
      title: title.trim(),
      description: description.trim() || null,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to add link");
      return;
    }

    toast.success("Link added!");
    setUrl("");
    setTitle("");
    setDescription("");
    onLinkAdded();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              required
            />
          </div>

          <div>
            <Label htmlFor="link-title">Title</Label>
            <Input
              id="link-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this link a name"
              required
            />
          </div>

          <div>
            <Label htmlFor="link-description">Description (Optional)</Label>
            <Textarea
              id="link-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a note about this link"
              rows={3}
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
              Add Link
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
