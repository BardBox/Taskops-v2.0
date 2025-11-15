import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Paperclip, Send, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Task {
  id: string;
  task_name: string;
  client_id: string;
  project_id: string | null;
  assignee_id: string;
  assigned_by_id: string;
  deadline: string | null;
  status: string;
  urgency: string;
  asset_link: string | null;
  notes: string | null;
  reference_link_1: string | null;
  reference_link_2: string | null;
  reference_link_3: string | null;
  actual_delivery: string | null;
  date: string;
}

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  message: string;
  image_url: string | null;
  created_at: string;
  profiles?: { full_name: string };
}

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  userRole: string;
  userId: string;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  taskId,
  userRole,
  userId,
}: TaskDetailDialogProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [assignedByName, setAssignedByName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (taskId && open) {
      fetchTaskDetails();
      fetchComments();
      subscribeToComments();
    }
  }, [taskId, open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const fetchTaskDetails = async () => {
    if (!taskId) return;

    try {
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskError) throw taskError;
      setTask(taskData);

      // Fetch related data
      if (taskData.client_id) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("name")
          .eq("id", taskData.client_id)
          .single();
        setClientName(clientData?.name || "");
      }

      if (taskData.project_id) {
        const { data: projectData } = await supabase
          .from("projects")
          .select("name")
          .eq("id", taskData.project_id)
          .single();
        setProjectName(projectData?.name || "");
      }

      const { data: assigneeData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", taskData.assignee_id)
        .single();
      setAssigneeName(assigneeData?.full_name || "");

      const { data: assignedByData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", taskData.assigned_by_id)
        .single();
      setAssignedByName(assignedByData?.full_name || "");
    } catch (error: any) {
      toast.error("Failed to fetch task details");
    }
  };

  const fetchComments = async () => {
    if (!taskId) return;

    try {
      const { data: commentsData, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profile names separately
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]));

      const enrichedComments = commentsData?.map(comment => ({
        ...comment,
        profiles: { full_name: profilesMap.get(comment.user_id) || "Unknown" }
      })) || [];

      setComments(enrichedComments);
    } catch (error: any) {
      toast.error("Failed to fetch comments");
    }
  };

  const subscribeToComments = () => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_comments",
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB");
        return;
      }
      setSelectedImage(file);
    }
  };

  const handleSendComment = async () => {
    if (!taskId || (!newComment.trim() && !selectedImage)) return;

    setUploading(true);
    try {
      let imageUrl = null;

      if (selectedImage) {
        const fileExt = selectedImage.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("task-chat-images")
          .upload(fileName, selectedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("task-chat-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { error } = await supabase.from("task_comments").insert([
        {
          task_id: taskId,
          user_id: userId,
          message: newComment.trim() || "(Image)",
          image_url: imageUrl,
        },
      ]);

      if (error) throw error;

      setNewComment("");
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast.error("Failed to send comment");
    } finally {
      setUploading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{task.task_name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
          {/* Left side - Task Details */}
          <ScrollArea className="pr-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Client</Label>
                <p className="font-medium">{clientName}</p>
              </div>

              {projectName && (
                <div>
                  <Label className="text-sm text-muted-foreground">Project</Label>
                  <p className="font-medium">{projectName}</p>
                </div>
              )}

              <div>
                <Label className="text-sm text-muted-foreground">Assignee</Label>
                <p className="font-medium">{assigneeName}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Assigned By</Label>
                <p className="font-medium">{assignedByName}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <p className="font-medium">{task.status}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Urgency</Label>
                <p className="font-medium">{task.urgency}</p>
              </div>

              {task.deadline && (
                <div>
                  <Label className="text-sm text-muted-foreground">Deadline</Label>
                  <p className="font-medium">{new Date(task.deadline).toLocaleDateString()}</p>
                </div>
              )}

              {task.actual_delivery && (
                <div>
                  <Label className="text-sm text-muted-foreground">Actual Delivery</Label>
                  <p className="font-medium">{new Date(task.actual_delivery).toLocaleDateString()}</p>
                </div>
              )}

              {task.asset_link && (
                <div>
                  <Label className="text-sm text-muted-foreground">Asset Link</Label>
                  <a href={task.asset_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {task.asset_link}
                  </a>
                </div>
              )}

              {task.reference_link_1 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Reference Link 1</Label>
                  <a href={task.reference_link_1} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {task.reference_link_1}
                  </a>
                </div>
              )}

              {task.reference_link_2 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Reference Link 2</Label>
                  <a href={task.reference_link_2} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {task.reference_link_2}
                  </a>
                </div>
              )}

              {task.reference_link_3 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Reference Link 3</Label>
                  <a href={task.reference_link_3} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {task.reference_link_3}
                  </a>
                </div>
              )}

              {task.notes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Notes</Label>
                  <p className="whitespace-pre-wrap">{task.notes}</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Right side - Chat */}
          <div className="flex flex-col h-full border-l pl-6">
            <h3 className="font-semibold mb-4">Discussion</h3>
            
            <ScrollArea className="flex-1 mb-4" ref={scrollRef}>
              <div className="space-y-4 pr-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {comment.profiles?.full_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">
                          {comment.profiles?.full_name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.message}</p>
                      {comment.image_url && (
                        <img
                          src={comment.image_url}
                          alt="Attachment"
                          className="mt-2 max-w-xs rounded border"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator className="mb-4" />

            <div className="space-y-2">
              {selectedImage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  <span>{selectedImage.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setSelectedImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendComment()}
                  disabled={uploading}
                />
                <Button onClick={handleSendComment} disabled={uploading || (!newComment.trim() && !selectedImage)}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
