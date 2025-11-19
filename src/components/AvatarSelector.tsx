import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DefaultAvatar {
  id: string;
  name: string;
  image_url: string;
  category: string;
}

interface AvatarSelectorProps {
  selectedAvatarUrl: string | null;
  onAvatarSelect: (url: string) => void;
  refreshTrigger?: number;
}

export function AvatarSelector({ selectedAvatarUrl, onAvatarSelect, refreshTrigger }: AvatarSelectorProps) {
  const [avatars, setAvatars] = useState<DefaultAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [canDelete, setCanDelete] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState<DefaultAvatar | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAvatars();
    checkDeletePermission();
  }, [refreshTrigger]);

  const checkDeletePermission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (roles) {
        const userRoles = roles.map(r => r.role);
        setCanDelete(
          userRoles.includes('project_owner') || 
          userRoles.includes('project_manager')
        );
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
    }
  };

  const fetchAvatars = async () => {
    try {
      const { data, error } = await supabase
        .from('default_avatars')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setAvatars(data || []);
    } catch (error) {
      console.error("Error fetching avatars:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (avatar: DefaultAvatar, e: React.MouseEvent) => {
    e.stopPropagation();
    setAvatarToDelete(avatar);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!avatarToDelete) return;
    
    setDeleting(true);
    try {
      // Delete all entries with this image URL (both custom and category-specific)
      const { error } = await supabase
        .from('default_avatars')
        .delete()
        .eq('image_url', avatarToDelete.image_url);

      if (error) throw error;

      toast.success("Avatar deleted successfully");
      setAvatars(prev => prev.filter(a => a.image_url !== avatarToDelete.image_url));
      setDeleteDialogOpen(false);
      setAvatarToDelete(null);
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast.error("Failed to delete avatar");
    } finally {
      setDeleting(false);
    }
  };

  const categories = ["all", ...Array.from(new Set(avatars.map(a => a.category)))];
  const filteredAvatars = selectedCategory === "all" 
    ? avatars 
    : avatars.filter(a => a.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (avatars.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>No avatars available yet.</p>
        <p className="text-sm mt-2">Generate avatars from the Avatar Generator page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Choose Avatar</Label>
        <p className="text-sm text-muted-foreground mt-1 mb-3">
          Select from {avatars.length} available avatars
        </p>
        <div className="flex gap-2 flex-wrap">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm capitalize transition-colors font-medium",
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto p-2 border rounded-lg bg-accent/20">
        {filteredAvatars.map(avatar => (
          <div key={avatar.id} className="relative group">
            <button
              onClick={() => onAvatarSelect(avatar.image_url)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover:bg-background border-2 border-transparent w-full",
                selectedAvatarUrl === avatar.image_url && "bg-background ring-2 ring-primary border-primary"
              )}
            >
              <Avatar className="w-14 h-14">
                <AvatarImage src={avatar.image_url} alt={avatar.name} />
                <AvatarFallback className="text-xs">{avatar.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-center line-clamp-2 font-medium">{avatar.name}</span>
            </button>
            
            {canDelete && avatar.category === 'custom' && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-1 -right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDeleteClick(avatar, e)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Avatar?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{avatarToDelete?.name}" from all categories. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
