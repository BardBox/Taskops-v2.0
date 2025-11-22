import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, Plus, Pin, Clock } from "lucide-react";
import { format } from "date-fns";

interface Broadcast {
  id: string;
  title: string;
  content: string;
  priority: string;
  is_pinned: boolean;
  created_at: string;
  expires_at: string | null;
  created_by: string;
  profiles: {
    full_name: string;
  };
}

const CommandPost = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("medium");
  const [isPinned, setIsPinned] = useState(false);
  const queryClient = useQueryClient();

  const { data: userRole } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      return data?.role;
    },
  });

  const { data: broadcasts = [] } = useQuery({
    queryKey: ["broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcasts")
        .select(`
          *,
          profiles:created_by (
            full_name
          )
        `)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Broadcast[];
    },
  });

  const createBroadcast = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("broadcasts").insert({
        title,
        content,
        priority,
        is_pinned: isPinned,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("Broadcast created successfully");
      setTitle("");
      setContent("");
      setPriority("medium");
      setIsPinned(false);
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to create broadcast");
    },
  });

  const canManage = userRole === "project_owner" || userRole === "project_manager";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "low":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <CardTitle>Command Post</CardTitle>
          </div>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Broadcast
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Broadcast</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Broadcast title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Message content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-4">
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant={isPinned ? "default" : "outline"}
                      onClick={() => setIsPinned(!isPinned)}
                    >
                      <Pin className="w-4 h-4 mr-2" />
                      {isPinned ? "Pinned" : "Pin"}
                    </Button>
                  </div>
                  <Button
                    onClick={() => createBroadcast.mutate()}
                    disabled={!title || !content}
                    className="w-full"
                  >
                    Create Broadcast
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {broadcasts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No broadcasts yet</p>
          ) : (
            broadcasts.map((broadcast) => (
              <div
                key={broadcast.id}
                className="border border-border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {broadcast.is_pinned && (
                        <Pin className="w-4 h-4 text-primary" />
                      )}
                      <h3 className="font-semibold text-foreground">{broadcast.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {broadcast.content}
                    </p>
                  </div>
                  <Badge className={getPriorityColor(broadcast.priority)}>
                    {broadcast.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{format(new Date(broadcast.created_at), "PPp")}</span>
                  <span>•</span>
                  <span>by {broadcast.profiles.full_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommandPost;
