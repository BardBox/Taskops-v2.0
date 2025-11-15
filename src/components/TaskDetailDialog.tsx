import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Paperclip, Send, X, ExternalLink, Edit2, Plus, Trash2, ThumbsUp, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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
  reactions?: Reaction[];
  read_receipts?: ReadReceipt[];
}

interface Reaction {
  id: string;
  user_id: string;
  reaction_type: string;
}

interface ReadReceipt {
  id: string;
  user_id: string;
  read_at: string;
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
  const [editingAssetLink, setEditingAssetLink] = useState(false);
  const [assetLinkValue, setAssetLinkValue] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [userProfiles, setUserProfiles] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (taskId && open) {
      fetchTaskDetails();
      fetchComments();
      subscribeToComments();
      subscribeToReactions();
      subscribeToReadReceipts();
      subscribeToTyping();
    }
  }, [taskId, open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  // Mark comments as read when they come into view
  useEffect(() => {
    if (comments.length > 0) {
      markCommentsAsRead();
    }
  }, [comments]);

  const subscribeToTyping = () => {
    if (!taskId) return;

    const channel = supabase.channel(`typing-${taskId}`, {
      config: { presence: { key: userId } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typingUserIds = new Set<string>();
        
        Object.keys(state).forEach(key => {
          const presences = state[key] as any[];
          presences.forEach(presence => {
            if (presence.typing && presence.user_id !== userId) {
              typingUserIds.add(presence.user_id);
            }
          });
        });
        
        setTypingUsers(typingUserIds);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToReactions = () => {
    if (!taskId) return;

    const channel = supabase
      .channel(`comment-reactions-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comment_reactions",
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

  const subscribeToReadReceipts = () => {
    if (!taskId) return;

    const channel = supabase
      .channel(`comment-receipts-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comment_read_receipts",
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

  const handleTyping = () => {
    if (!taskId) return;

    const channel = supabase.channel(`typing-${taskId}`);
    channel.track({ user_id: userId, typing: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      channel.track({ user_id: userId, typing: false });
    }, 2000);
  };

  const markCommentsAsRead = async () => {
    if (!taskId || comments.length === 0) return;

    try {
      const unreadComments = comments.filter(
        c => c.user_id !== userId && !c.read_receipts?.some(r => r.user_id === userId)
      );

      for (const comment of unreadComments) {
        await supabase.from("comment_read_receipts").insert({
          comment_id: comment.id,
          user_id: userId,
        });
      }
    } catch (error: any) {
      console.error("Failed to mark comments as read:", error);
    }
  };

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
      setAssetLinkValue(taskData.asset_link || "");

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

      // Fetch profile names
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]));
      setUserProfiles(profilesMap);

      // Fetch reactions and read receipts for each comment
      const commentIds = commentsData?.map(c => c.id) || [];
      
      const { data: reactionsData } = await supabase
        .from("comment_reactions")
        .select("*")
        .in("comment_id", commentIds);

      const { data: receiptsData } = await supabase
        .from("comment_read_receipts")
        .select("*")
        .in("comment_id", commentIds);

      const reactionsMap = new Map<string, Reaction[]>();
      reactionsData?.forEach(r => {
        const existing = reactionsMap.get(r.comment_id) || [];
        reactionsMap.set(r.comment_id, [...existing, r]);
      });

      const receiptsMap = new Map<string, ReadReceipt[]>();
      receiptsData?.forEach(r => {
        const existing = receiptsMap.get(r.comment_id) || [];
        receiptsMap.set(r.comment_id, [...existing, r]);
      });

      const enrichedComments = commentsData?.map(comment => ({
        ...comment,
        profiles: { full_name: profilesMap.get(comment.user_id) || "Unknown" },
        reactions: reactionsMap.get(comment.id) || [],
        read_receipts: receiptsMap.get(comment.id) || [],
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

  const handleReaction = async (commentId: string) => {
    try {
      // Check if user already reacted
      const existingReaction = comments
        .find(c => c.id === commentId)
        ?.reactions?.find(r => r.user_id === userId);

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from("comment_reactions")
          .delete()
          .eq("id", existingReaction.id);
      } else {
        // Add reaction
        await supabase.from("comment_reactions").insert({
          comment_id: commentId,
          user_id: userId,
          reaction_type: "thumbs_up",
        });
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to add reaction");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);

      if (error) throw error;
      setTask({ ...task, status: newStatus });
      toast.success("Status updated");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleUrgencyChange = async (newUrgency: string) => {
    if (!task) return;
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ urgency: newUrgency })
        .eq("id", task.id);

      if (error) throw error;
      setTask({ ...task, urgency: newUrgency });
      toast.success("Urgency updated");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update urgency");
    }
  };

  const handleSaveAssetLink = async () => {
    if (!task) return;
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ asset_link: assetLinkValue || null })
        .eq("id", task.id);

      if (error) throw error;
      setTask({ ...task, asset_link: assetLinkValue || null });
      setEditingAssetLink(false);
      toast.success("Asset link updated");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update asset link");
    }
  };

  const handleDeleteAssetLink = async () => {
    if (!task) return;
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ asset_link: null })
        .eq("id", task.id);

      if (error) throw error;
      setTask({ ...task, asset_link: null });
      setAssetLinkValue("");
      toast.success("Asset link removed");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to remove asset link");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Not Started": "bg-slate-500",
      "In Progress": "bg-blue-500",
      "Waiting for Approval": "bg-yellow-500",
      "Approved": "bg-green-500",
      "Revision": "bg-orange-500",
      "On Hold": "bg-gray-500",
    };
    return colors[status] || "bg-slate-500";
  };

  const getUrgencyColor = (urgency: string) => {
    const colors: Record<string, string> = {
      "Low": "bg-green-100 text-green-800 border-green-300",
      "Normal": "bg-blue-100 text-blue-800 border-blue-300",
      "High": "bg-orange-100 text-orange-800 border-orange-300",
      "Urgent": "bg-red-100 text-red-800 border-red-300",
    };
    return colors[urgency] || "bg-slate-100 text-slate-800 border-slate-300";
  };

  const getDelayStatus = () => {
    if (!task?.deadline) return null;
    
    const deadlineDate = new Date(task.deadline);
    const compareDate = task.actual_delivery 
      ? new Date(task.actual_delivery) 
      : new Date();
    
    const isDelayed = compareDate > deadlineDate;
    
    return {
      status: isDelayed ? "Delayed" : "On Track",
      className: isDelayed 
        ? "bg-red-100 text-red-800 border-red-300" 
        : "bg-green-100 text-green-800 border-green-300"
    };
  };

  if (!task) return null;

  const delayStatus = getDelayStatus();
  const typingUserNames = Array.from(typingUsers)
    .map(uid => userProfiles.get(uid))
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`w-1 h-12 ${getStatusColor(task.status)} rounded-full`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">{clientName}</h2>
                <Badge variant="outline" className={getUrgencyColor(task.urgency)}>
                  {task.urgency}
                </Badge>
                {delayStatus && (
                  <Badge variant="outline" className={delayStatus.className}>
                    {delayStatus.status}
                  </Badge>
                )}
              </div>
              <p className="text-lg text-muted-foreground mt-1">{task.task_name}</p>
            </div>
          </div>
        </div>

        {/* Task Details - Scrollable */}
        <ScrollArea className="max-h-[35vh] border-b">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Assignee</Label>
                <p className="font-medium mt-1">{assigneeName}</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Assigned By</Label>
                <p className="font-medium mt-1">{assignedByName}</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
                <Select value={task.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Waiting for Approval">Waiting for Approval</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Revision">Revision</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Urgency</Label>
                <Select value={task.urgency} onValueChange={handleUrgencyChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {task.deadline && (
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Deadline</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-bold text-lg text-primary">
                      {new Date(task.deadline).toLocaleDateString()}
                    </p>
                    {delayStatus && (
                      <Badge variant="outline" className={delayStatus.className}>
                        {delayStatus.status}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {task.actual_delivery && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Actual Delivery</Label>
                  <p className="font-medium mt-1">{new Date(task.actual_delivery).toLocaleDateString()}</p>
                </div>
              )}

              {projectName && (
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Project</Label>
                  <p className="font-medium mt-1">{projectName}</p>
                </div>
              )}
            </div>

            {/* Asset Link */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Asset Link</Label>
              {editingAssetLink ? (
                <div className="flex gap-2 mt-1">
                  <Input
                    value={assetLinkValue}
                    onChange={(e) => setAssetLinkValue(e.target.value)}
                    placeholder="Enter asset link URL"
                  />
                  <Button size="icon" variant="outline" onClick={handleSaveAssetLink}>
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setEditingAssetLink(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  {task.asset_link ? (
                    <>
                      <a
                        href={task.asset_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Asset
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setAssetLinkValue(task.asset_link || "");
                          setEditingAssetLink(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleDeleteAssetLink}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingAssetLink(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Asset Link
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Reference Links */}
            {(task.reference_link_1 || task.reference_link_2 || task.reference_link_3) && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reference Links</Label>
                <div className="space-y-2 mt-1">
                  {task.reference_link_1 && (
                    <a
                      href={task.reference_link_1}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Reference 1
                    </a>
                  )}
                  {task.reference_link_2 && (
                    <a
                      href={task.reference_link_2}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Reference 2
                    </a>
                  )}
                  {task.reference_link_3 && (
                    <a
                      href={task.reference_link_3}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Reference 3
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {task.notes && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                <p className="whitespace-pre-wrap mt-1 text-sm">{task.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Discussion Section - Fixed Height */}
        <div className="flex flex-col h-[40vh] p-6">
          <h3 className="font-semibold text-lg mb-4">Discussion</h3>
          
          {/* Messages - Scrollable */}
          <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
            <div className="space-y-4">
              {comments.map((comment) => {
                const userReacted = comment.reactions?.some(r => r.user_id === userId);
                const reactionCount = comment.reactions?.length || 0;
                const readCount = comment.read_receipts?.length || 0;

                return (
                  <div key={comment.id} className="flex gap-3 group">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
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
                      <p className="text-sm mt-1 bg-muted/50 rounded-lg p-3">{comment.message}</p>
                      {comment.image_url && (
                        <img
                          src={comment.image_url}
                          alt="Attachment"
                          className="mt-2 max-w-xs rounded-lg border"
                        />
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 ${userReacted ? 'bg-primary/10 text-primary' : ''}`}
                          onClick={() => handleReaction(comment.id)}
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {reactionCount > 0 && <span className="text-xs">{reactionCount}</span>}
                        </Button>
                        {readCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {readCount} read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Typing Indicator */}
          {typingUserNames.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              {typingUserNames.join(", ")} {typingUserNames.length === 1 ? "is" : "are"} typing...
            </div>
          )}

          {/* Message Input - Always Visible */}
          <div className="space-y-2">
            {selectedImage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                <Paperclip className="h-4 w-4" />
                <span>{selectedImage.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-auto"
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
              <Textarea
                placeholder="Type a message..."
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  handleTyping();
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                disabled={uploading}
                className="min-h-[60px] resize-none"
              />
              <Button 
                onClick={handleSendComment} 
                disabled={uploading || (!newComment.trim() && !selectedImage)}
                size="icon"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
