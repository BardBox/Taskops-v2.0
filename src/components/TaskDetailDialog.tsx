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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Paperclip, Send, X, ExternalLink, Edit2, Plus, Trash2, ThumbsUp, Loader2, ChevronUp, ChevronDown, Pin, Eye, Smile } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { canTeamMemberChangeStatus, getAvailableStatuses, canChangeUrgency } from "@/utils/roleHelpers";
import { TaskRevisions } from "@/components/TaskRevisions";

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
  parent_task_id: string | null;
  revision_number: number;
  is_revision: boolean;
}

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  message: string;
  image_url: string | null;
  created_at: string;
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_by_id?: string | null;
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
  user_name?: string;
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
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [userProfiles, setUserProfiles] = useState<Map<string, string>>(new Map());
  const [isTaskDetailsCollapsed, setIsTaskDetailsCollapsed] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showMessageEmojiPicker, setShowMessageEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);

  const reactionEmojis = [
    { type: 'thumbs_up', emoji: '👍', label: 'Like' },
    { type: 'heart', emoji: '❤️', label: 'Love' },
    { type: 'laugh', emoji: '😂', label: 'Laugh' },
    { type: 'surprised', emoji: '😮', label: 'Surprised' },
    { type: 'sad', emoji: '😢', label: 'Sad' },
    { type: 'fire', emoji: '🔥', label: 'Fire' },
  ];

  useEffect(() => {
    if (taskId && open) {
      fetchTaskDetails();
      fetchComments();
      
      const cleanupComments = subscribeToComments();
      const cleanupReactions = subscribeToReactions();
      const cleanupReceipts = subscribeToReadReceipts();
      const cleanupTyping = subscribeToTyping();

      return () => {
        if (cleanupComments) cleanupComments();
        if (cleanupReactions) cleanupReactions();
        if (cleanupReceipts) cleanupReceipts();
        if (cleanupTyping) cleanupTyping();
      };
    }
  }, [taskId, open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  useEffect(() => {
    if (comments.length > 0) {
      markCommentsAsRead();
    }
  }, [comments]);

  // Auto-scroll to bottom when new comments appear
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const subscribeToTyping = () => {
    if (!taskId) return;

    const channel = supabase.channel(`typing-${taskId}`, {
      config: { presence: { key: userId } }
    });

    typingChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.typing && presence.user_id !== userId) {
              typing.add(presence.user_id);
            }
          });
        });
        
        setTypingUsers(typing);
      })
      .subscribe();

    return () => {
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  };

  const subscribeToComments = () => {
    if (!taskId) return;

    const channel = supabase
      .channel(`comments-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_comments",
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          // Remove any optimistic comments when real one arrives
          if (payload.eventType === 'INSERT') {
            setComments(prev => prev.filter(c => !c.id.startsWith('optimistic-')));
          }
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToReactions = () => {
    const channel = supabase
      .channel("comment_reactions")
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
    const channel = supabase
      .channel("comment_read_receipts")
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
    if (!taskId || !typingChannelRef.current) return;

    typingChannelRef.current.track({ user_id: userId, typing: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (typingChannelRef.current) {
        typingChannelRef.current.track({ user_id: userId, typing: false });
      }
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
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]));
      setUserProfiles(profilesMap);

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
        receiptsMap.set(r.comment_id, [...existing, {
          ...r,
          user_name: profilesMap.get(r.user_id) || "Unknown User"
        }]);
      });

      const enrichedComments = commentsData?.map(c => ({
        ...c,
        profiles: { full_name: profilesMap.get(c.user_id) || "Unknown" },
        reactions: reactionsMap.get(c.id) || [],
        read_receipts: receiptsMap.get(c.id) || [],
      })) || [];

      setComments(enrichedComments);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setSelectedImage(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("task-chat-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("task-chat-images")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
      return null;
    }
  };

  const handleSendComment = async () => {
    if (!taskId || (!newComment.trim() && !selectedImage)) return;

    const messageText = newComment.trim() || "(Image)";
    const tempComment = newComment;
    const tempImage = selectedImage;
    
    // Clear input immediately
    setNewComment("");
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      setUploading(true);

      let imageUrl = null;
      if (tempImage) {
        imageUrl = await uploadImage(tempImage);
        if (!imageUrl) {
          setNewComment(tempComment);
          setSelectedImage(tempImage);
          setUploading(false);
          return;
        }
      }

      const { error } = await supabase.from("task_comments").insert([
        {
          task_id: taskId,
          user_id: userId,
          message: messageText,
          image_url: imageUrl,
        },
      ]);

      if (error) throw error;
    } catch (error: any) {
      setNewComment(tempComment);
      setSelectedImage(tempImage);
      toast.error("Failed to send comment");
    } finally {
      setUploading(false);
    }
  };

  const handleReaction = async (commentId: string, reactionType: string) => {
    try {
      const existingReaction = comments
        .find(c => c.id === commentId)
        ?.reactions?.find(r => r.user_id === userId && r.reaction_type === reactionType);

      if (existingReaction) {
        await supabase
          .from("comment_reactions")
          .delete()
          .eq("id", existingReaction.id);
      } else {
        await supabase.from("comment_reactions").insert({
          comment_id: commentId,
          user_id: userId,
          reaction_type: reactionType,
        });
      }
      
      setShowReactionPicker(null);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to add reaction");
    }
  };

  const getReactionsByType = (reactions: Reaction[]) => {
    const grouped = new Map<string, { count: number; userIds: string[] }>();
    reactions.forEach(r => {
      const existing = grouped.get(r.reaction_type) || { count: 0, userIds: [] };
      grouped.set(r.reaction_type, {
        count: existing.count + 1,
        userIds: [...existing.userIds, r.user_id]
      });
    });
    return grouped;
  };

  const insertEmojiIntoMessage = (emoji: string) => {
    setNewComment(prev => prev + emoji);
    setShowMessageEmojiPicker(false);
  };

  const isOnlyEmojis = (text: string) => {
    // Remove all whitespace and check if remaining characters are only emojis
    const trimmed = text.trim();
    // Regex to match emoji characters and common emoji patterns
    const emojiRegex = /^[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\p{Emoji_Component}\s]+$/u;
    return emojiRegex.test(trimmed) && trimmed.length > 0;
  };

  const togglePinComment = async (commentId: string, currentPinState: boolean) => {
    try {
      const { error } = await supabase
        .from("task_comments")
        .update({
          is_pinned: !currentPinState,
          pinned_at: !currentPinState ? new Date().toISOString() : null,
          pinned_by_id: !currentPinState ? userId : null,
        })
        .eq("id", commentId);

      if (error) throw error;

      toast.success(currentPinState ? "Message unpinned" : "Message pinned");
      fetchComments();
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update pin status");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast.success("Comment deleted");
      fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
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

  const handleNotesSave = async () => {
    if (!task) return;
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ notes: notesValue })
        .eq("id", task.id);

      if (error) throw error;
      setTask({ ...task, notes: notesValue });
      setEditingNotes(false);
      toast.success("Description updated");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update description");
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

  const getUserAvatarColor = (userId: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-rose-500",
      "bg-amber-500",
    ];
    
    // Generate consistent color based on user ID
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (!task) return null;

  const delayStatus = getDelayStatus();
  const typingUserNames = Array.from(typingUsers)
    .map(uid => userProfiles.get(uid))
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden gap-0">
        <div className="p-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-1 h-12 ${getStatusColor(task.status)} rounded-full`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">{clientName}</h2>
                {task.is_revision && (
                  <Badge variant="secondary" className="text-xs">
                    Revision {task.revision_number}
                  </Badge>
                )}
                <Badge variant="outline" className={getUrgencyColor(task.urgency)}>
                  {task.urgency}
                </Badge>
                {delayStatus && (
                  <Badge variant="outline" className={delayStatus.className}>
                    {delayStatus.status}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTaskDetailsCollapsed(!isTaskDetailsCollapsed)}
                  className="ml-auto"
                >
                  {isTaskDetailsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-lg text-muted-foreground mt-1">{task.task_name}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className={`border-b transition-all duration-300 ease-in-out ${isTaskDetailsCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[50vh]'}`}>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Task Owner</Label>
                  <p className="text-sm font-medium mt-1">{assigneeName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Project Manager</Label>
                  <p className="text-sm font-medium mt-1">{assignedByName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date Assigned</Label>
                  <p className="text-sm font-medium mt-1">{format(new Date(task.date), 'PPP')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Deadline</Label>
                  <p className="text-sm font-medium mt-1">
                    {task.deadline ? format(new Date(task.deadline), 'PPP') : 'No deadline'}
                  </p>
                </div>
                {task.actual_delivery && (
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Submission Date</Label>
                    <p className="text-sm font-medium mt-1">{format(new Date(task.actual_delivery), 'PPP')}</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
                  {(() => {
                    const availableStatuses = getAvailableStatuses(userRole, task.status || "");
                    const canChange = userRole !== "team_member" || (userRole === "team_member" && availableStatuses.length > 0);
                    
                    if (!canChange) {
                      return (
                        <Badge variant="outline" className="h-8 px-4">
                          {task.status}
                        </Badge>
                      );
                    }
                    
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-4 text-sm font-medium hover:bg-accent"
                          >
                            {task.status}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2 bg-background border shadow-lg z-50" align="start">
                          <div className="space-y-1">
                            {availableStatuses.map((status) => (
                              <Button
                                key={status}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-sm hover:bg-accent"
                                onClick={() => handleStatusChange(status)}
                              >
                                {status}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  })()}
                </div>
                
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Urgency</Label>
                  {!canChangeUrgency(userRole) ? (
                    <Badge variant="outline" className="h-8 px-4">
                      {task.urgency}
                    </Badge>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 px-4 text-sm font-medium hover:bg-accent">
                          {task.urgency}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-2 bg-background border shadow-lg z-50" align="start">
                        <div className="space-y-1">
                          {["Low", "Medium", "High", "Immediate"].map((urgency) => (
                            <Button
                              key={urgency}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-sm hover:bg-accent"
                              onClick={() => handleUrgencyChange(urgency)}
                            >
                              {urgency}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setEditingNotes(!editingNotes);
                      if (!editingNotes) setNotesValue(task.notes || "");
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
                {editingNotes ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Enter description..."
                      className="text-sm min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleNotesSave}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingNotes(false);
                        setNotesValue(task.notes || "");
                      }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {task.notes || "No description"}
                  </p>
                )}
              </div>

              {(task.reference_link_1 || task.reference_link_2 || task.reference_link_3) && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reference Links</Label>
                  <div className="space-y-1 mt-1">
                    {task.reference_link_1 && (
                      <a 
                        href={task.reference_link_1} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {task.reference_link_1}
                      </a>
                    )}
                    {task.reference_link_2 && (
                      <a 
                        href={task.reference_link_2} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {task.reference_link_2}
                      </a>
                    )}
                    {task.reference_link_3 && (
                      <a 
                        href={task.reference_link_3} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {task.reference_link_3}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {task.asset_link && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Asset Link</Label>
                  <a 
                    href={task.asset_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {task.asset_link}
                  </a>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="px-6 pb-6">
              <TaskRevisions
                taskId={task.id}
                taskName={task.task_name}
                clientId={task.client_id}
                projectId={task.project_id}
                assigneeId={task.assignee_id}
                deadline={task.deadline}
                urgency={task.urgency}
                notes={task.notes}
                referenceLink1={task.reference_link_1}
                referenceLink2={task.reference_link_2}
                referenceLink3={task.reference_link_3}
                status={task.status}
                userRole={userRole}
                userId={userId}
                isRevision={task.is_revision}
                parentTaskId={task.parent_task_id}
                onRevisionCreated={fetchTaskDetails}
              />
            </div>
          </div>

          <div className="bg-muted/30 flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold">Discussion</h3>
            </div>
            
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="p-4 space-y-2">
              {comments.map((comment, index) => (
              <div key={comment.id} className={`flex gap-3 p-3 rounded-lg ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={`text-white font-semibold ${getUserAvatarColor(comment.user_id)}`}>
                    {comment.profiles?.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.profiles?.full_name || "Unknown User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                    {comment.is_pinned && (
                      <Badge variant="secondary" className="text-xs">
                        <Pin className="h-3 w-3 mr-1" />
                        Pinned
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => togglePinComment(comment.id, comment.is_pinned || false)}
                      >
                        <Pin className={`h-3 w-3 ${comment.is_pinned ? 'fill-current' : ''}`} />
                      </Button>
                      {userRole === 'project_owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-muted-foreground/80"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className={isOnlyEmojis(comment.message) ? "text-5xl leading-tight" : "text-sm"}>{comment.message}</p>
                  {comment.image_url && (
                    <img
                      src={comment.image_url}
                      alt="Attachment"
                      className="max-w-xs rounded-lg mt-2"
                    />
                  )}
                  
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    {comment.reactions && comment.reactions.length > 0 && (
                      <>
                        {Array.from(getReactionsByType(comment.reactions).entries()).map(([type, data]) => {
                          const emojiData = reactionEmojis.find(e => e.type === type);
                          const userReacted = data.userIds.includes(userId);
                          
                          return (
                            <HoverCard key={type} openDelay={200}>
                              <HoverCardTrigger asChild>
                                <button
                                  onClick={() => handleReaction(comment.id, type)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                                    userReacted 
                                      ? 'bg-primary/10 border border-primary/20' 
                                      : 'bg-muted hover:bg-muted/80 border border-transparent'
                                  }`}
                                >
                                  <span className="text-base">{emojiData?.emoji || '👍'}</span>
                                  <span className="font-medium">{data.count}</span>
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-auto p-2 bg-background border shadow-lg z-50" align="start">
                                <div className="space-y-1">
                                  {data.userIds.map(uid => (
                                    <div key={uid} className="text-xs">
                                      {userProfiles.get(uid) || "Unknown User"}
                                    </div>
                                  ))}
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          );
                        })}
                      </>
                    )}
                    
                    <Popover open={showReactionPicker === comment.id} onOpenChange={(open) => setShowReactionPicker(open ? comment.id : null)}>
                      <PopoverTrigger asChild>
                        <button
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Smile className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" align="start">
                        <div className="flex gap-1">
                          {reactionEmojis.map(({ type, emoji, label }) => (
                            <button
                              key={type}
                              onClick={() => handleReaction(comment.id, type)}
                              className="text-2xl hover:scale-125 transition-transform p-1 rounded hover:bg-muted"
                              title={label}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    {comment.read_receipts && comment.read_receipts.length > 0 && (
                      <HoverCard openDelay={200}>
                        <HoverCardTrigger asChild>
                          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Eye className="h-3 w-3" />
                            <span>{comment.read_receipts.length}</span>
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-auto p-3 bg-background border shadow-lg z-50" align="start">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Seen by:</p>
                            {comment.read_receipts.map((receipt) => (
                              <div key={receipt.id} className="text-sm">
                                {receipt.user_name}
                              </div>
                            ))}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </div>
                </div>
              </div>
            ))}

              {typingUserNames.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {typingUserNames.join(", ")} {typingUserNames.length === 1 ? "is" : "are"} typing...
                </div>
              )}
              <div ref={commentsEndRef} />
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="p-4 border-t bg-background flex-shrink-0">
            {selectedImage && (
              <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-lg">
                <span className="text-sm truncate flex-1">{selectedImage.name}</span>
                <Button
                  onClick={() => {
                    setSelectedImage(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
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
                placeholder="Type a message..."
                disabled={uploading}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Popover open={showMessageEmojiPicker} onOpenChange={setShowMessageEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={uploading}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <div className="grid grid-cols-6 gap-1">
                    {reactionEmojis.map(({ emoji, label }) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmojiIntoMessage(emoji)}
                        className="text-2xl hover:scale-125 transition-transform p-1 rounded hover:bg-muted"
                        title={label}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="icon"
                disabled={uploading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button onClick={handleSendComment} disabled={uploading || (!newComment.trim() && !selectedImage)}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}