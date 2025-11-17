import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DefaultAvatar {
  id: string;
  name: string;
  image_url: string;
  category: string;
}

interface AvatarSelectorProps {
  selectedAvatarUrl: string | null;
  onAvatarSelect: (url: string) => void;
}

export function AvatarSelector({ selectedAvatarUrl, onAvatarSelect }: AvatarSelectorProps) {
  const [avatars, setAvatars] = useState<DefaultAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchAvatars();
  }, []);

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
        <Label>Choose Avatar</Label>
        <div className="flex gap-2 mt-2 flex-wrap">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-3 py-1 rounded-full text-sm capitalize transition-colors",
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

      <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-2">
        {filteredAvatars.map(avatar => (
          <button
            key={avatar.id}
            onClick={() => onAvatarSelect(avatar.image_url)}
            className={cn(
              "flex flex-col items-center gap-2 p-2 rounded-lg transition-all hover:bg-accent",
              selectedAvatarUrl === avatar.image_url && "bg-accent ring-2 ring-primary"
            )}
          >
            <Avatar className="w-16 h-16">
              <AvatarImage src={avatar.image_url} alt={avatar.name} />
              <AvatarFallback>{avatar.name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-center line-clamp-2">{avatar.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
