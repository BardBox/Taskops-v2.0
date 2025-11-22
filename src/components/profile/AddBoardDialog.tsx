import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onBoardAdded: () => void;
}

const DEFAULT_ICONS = ["📁", "💡", "🎨", "📚", "🔧", "⭐", "🎯", "🚀"];

export function AddBoardDialog({
  open,
  onOpenChange,
  userId,
  onBoardAdded,
}: AddBoardDialogProps) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("📁");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const { error } = await supabase.from("link_boards").insert({
      user_id: userId,
      name: name.trim(),
      icon: selectedIcon,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to create board");
      return;
    }

    toast.success("Board created!");
    setName("");
    setSelectedIcon("📁");
    onBoardAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Inspiration Board</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="board-name">Board Name</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Design Inspiration, Learning Resources"
              required
            />
          </div>

          <div>
            <Label>Choose Icon</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DEFAULT_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`text-2xl p-2 rounded-md transition-colors ${
                    selectedIcon === icon
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
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
              Create Board
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
