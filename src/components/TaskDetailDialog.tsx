import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Paperclip, Send, X, ExternalLink, Edit2, Plus, Trash2, ThumbsUp, Loader2, Pin, Eye, Smile, Lock, Wand2, User, UsersRound, Activity, Zap, MessageSquare, Clock, GitBranch, FileText, Maximize2, Minimize2, FileEdit, Copy, Timer } from "lucide-react";
import { TaskTimeline } from "@/components/TaskTimeline";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { canTeamMemberChangeStatus, getAvailableStatuses, canChangeUrgency } from "@/utils/roleHelpers";
import { TaskRevisions } from "@/components/TaskRevisions";
import { TaskHistory } from "@/components/TaskHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditTaskTab } from "@/components/EditTaskTab";
import { RequestRevisionDialog } from "@/components/RequestRevisionDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { MentionInput } from "@/components/hive/MentionInput";
import { MessageWithMentions } from "@/components/hive/MessageWithMentions";
import { useTaskTimeTracking } from "@/hooks/useTaskTimeTracking";
import { TimeTrackingBadge } from "@/components/TimeTrackingBadge";

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
  reference_image: string | null;
  actual_delivery: string | null;
  date: string;
  revision_count: number;
  revision_requested_at: string | null;
  revision_requested_by: string | null;
  is_posted?: boolean;
  posted_at?: string | null;
  posted_by?: string | null;
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
  profiles?: { full_name: string; avatar_url: string | null };
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
  onDuplicate?: (data: any) => void;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  taskId,
  userRole,
  userId,
  onDuplicate,
}: TaskDetailDialogProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [showRequestRevision, setShowRequestRevision] = useState(false);
  const [assetLink, setAssetLink] = useState("");
  const [isPosted, setIsPosted] = useState(false);
  const [assigneeName, setAssigneeName] = useState("");
  const [assigneeAvatar, setAssigneeAvatar] = useState("");
  const [assigneeCreativeTitle, setAssigneeCreativeTitle] = useState("");
  const [assignedByName, setAssignedByName] = useState("");
  const [assignedByAvatar, setAssignedByAvatar] = useState("");
  const [assignedByCreativeTitle, setAssignedByCreativeTitle] = useState("");
  const [editingAssetLink, setEditingAssetLink] = useState(false);
  const [assetLinkValue, setAssetLinkValue] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [userProfiles, setUserProfiles] = useState<Map<string, string>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showMessageEmojiPicker, setShowMessageEmojiPicker] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);

  // Time tracking hook
  const { records: timeRecords, isLoading: timeLoading } = useTaskTimeTracking({ taskId: taskId || undefined });

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
      setAssetLink(taskData.asset_link || "");
      setIsPosted(taskData.is_posted || false);

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
        .select("full_name, avatar_url, creative_title")
        .eq("id", taskData.assignee_id)
        .single();
      setAssigneeName(assigneeData?.full_name || "");
      setAssigneeAvatar(assigneeData?.avatar_url || "");
      setAssigneeCreativeTitle(assigneeData?.creative_title || "");

      const { data: assignedByData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, creative_title")
        .eq("id", taskData.assigned_by_id)
        .single();
      setAssignedByName(assignedByData?.full_name || "");
      setAssignedByAvatar(assignedByData?.avatar_url || "");
      setAssignedByCreativeTitle(assignedByData?.creative_title || "");

      // Check if user is a collaborator
      const { data: collabCheck } = await supabase
        .from("task_collaborators")
        .select("user_id")
        .eq("task_id", taskId)
        .eq("user_id", userId)
        .single();

      setIsCollaborator(!!collabCheck);

      // Fetch collaborators for role fetching
      const { data: collabData } = await supabase
        .from("task_collaborators")
        .select("user_id, profiles!task_collaborators_user_id_fkey(full_name, avatar_url)")
        .eq("task_id", taskId);

      setCollaborators(collabData || []);

      // Fetch current user's name for mentions
      const { data: currentUserData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      setCurrentUserName(currentUserData?.full_name || null);
    } catch (error: any) {
      toast.error("Failed to fetch task details");
    }
  };

  const fetchCollaborators = async () => {
    if (!taskId) return;

    const { data } = await supabase
      .from("task_collaborators")
      .select("user_id, profiles!task_collaborators_user_id_fkey(full_name, avatar_url)")
      .eq("task_id", taskId);

    setCollaborators(data || []);
  };

  const fetchEditHistory = async () => {
    if (!taskId) return;

    const { data } = await supabase
      .from("task_edit_history")
      .select(`
        *,
        profiles:edited_by_id(full_name)
      `)
      .eq("task_id", taskId)
      .order("edited_at", { ascending: false });

    setEditHistory(data || []);
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
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
      setUserProfiles(new Map(profilesData?.map(p => [p.id, p.full_name || "Unknown"])));

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
          user_name: userProfiles.get(r.user_id) || "Unknown User"
        }]);
      });

      const enrichedComments = commentsData?.map(c => ({
        ...c,
        profiles: profilesMap.get(c.user_id) || { full_name: "Unknown", avatar_url: null },
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
    if (!["project_manager", "project_owner"].includes(userRole)) {
      toast.error("You do not have permission to change status");
      return;
    }
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);

      if (error) throw error;
      setTask({ ...task, status: newStatus });

      // Handle timer logic based on status
      const { data: activeTimers } = await supabase
        .from('task_time_tracking')
        .select('*')
        .eq('task_id', task.id)
        .eq('tracking_status', 'active');

      if (activeTimers && activeTimers.length > 0) {
        const now = new Date().toISOString();

        // PAUSE conditions
        if (['in_approval', 'hold'].includes(newStatus)) {
          for (const timer of activeTimers) {
            const duration = Math.floor((new Date(now).getTime() - new Date(timer.last_active_at || now).getTime()) / 1000);

            // Create session
            await (supabase as any).from('task_time_sessions').insert({
              task_id: timer.task_id,
              user_id: timer.user_id,
              started_at: timer.last_active_at,
              ended_at: now,
              duration_seconds: duration,
            });

            await supabase
              .from('task_time_tracking')
              .update({
                tracking_status: 'paused',
                paused_at: now,
                total_seconds: timer.total_seconds + duration,
              })
              .eq('id', timer.id);
          }
          toast.info("Task timer paused due to status change");
        }

        // STOP conditions
        if (['approved', 'cancelled', 'rejected'].includes(newStatus)) {
          for (const timer of activeTimers) {
            const duration = Math.floor((new Date(now).getTime() - new Date(timer.last_active_at || now).getTime()) / 1000);

            // Create session
            await (supabase as any).from('task_time_sessions').insert({
              task_id: timer.task_id,
              user_id: timer.user_id,
              started_at: timer.last_active_at,
              ended_at: now,
              duration_seconds: duration,
            });

            await supabase
              .from('task_time_tracking')
              .update({
                tracking_status: 'stopped',
                stopped_at: now,
                total_seconds: timer.total_seconds + duration,
              })
              .eq('id', timer.id);
          }
          toast.info("Task timer stopped due to status change");
        }
      }

      toast.success("Status updated");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleUrgencyChange = async (newUrgency: string) => {
    if (!task) return;
    if (!["project_manager", "project_owner"].includes(userRole)) {
      toast.error("You do not have permission to change urgency");
      return;
    }
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

  const handleDeadlineChange = async (newDeadline: string) => {
    if (!task) return;
    if (!["project_manager", "project_owner"].includes(userRole)) {
      toast.error("You do not have permission to change deadline");
      return;
    }
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ deadline: newDeadline })
        .eq("id", task.id);

      if (error) throw error;
      setTask({ ...task, deadline: newDeadline });
      toast.success("Deadline updated");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update deadline");
    }
  };

  const handleNotesSave = async () => {
    if (!task) return;

    const canEdit = ["project_manager", "project_owner"].includes(userRole);

    if (!canEdit) {
      toast.error("You do not have permission to edit task descriptions");
      return;
    }

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
    if (!["project_manager", "project_owner"].includes(userRole)) {
      toast.error("You do not have permission to change asset links");
      return;
    }
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const oldAssetLink = task.asset_link;

      const { error } = await supabase
        .from("tasks")
        .update({ asset_link: assetLinkValue || null })
        .eq("id", task.id);

      if (error) throw error;

      // Track asset link change in history if it changed
      if (oldAssetLink !== assetLinkValue) {
        const { error: historyError } = await supabase
          .from("task_edit_history")
          .insert({
            task_id: task.id,
            edited_by_id: user.id,
            field_name: "asset_link",
            old_value: oldAssetLink || "(empty)",
            new_value: assetLinkValue || "(empty)",
            change_description: oldAssetLink
              ? "Asset link updated"
              : "Asset link added",
          });

        if (historyError) {
          console.error("Failed to log asset link history:", historyError);
        }
      }

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
    if (!["project_manager", "project_owner"].includes(userRole)) {
      toast.error("You do not have permission to delete asset links");
      return;
    }
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const oldAssetLink = task.asset_link;

      const { error } = await supabase
        .from("tasks")
        .update({ asset_link: null })
        .eq("id", task.id);

      if (error) throw error;

      // Track asset link deletion in history
      if (oldAssetLink) {
        const { error: historyError } = await supabase
          .from("task_edit_history")
          .insert({
            task_id: task.id,
            edited_by_id: user.id,
            field_name: "asset_link",
            old_value: oldAssetLink,
            new_value: "(empty)",
            change_description: "Asset link removed",
          });

        if (historyError) {
          console.error("Failed to log asset link history:", historyError);
        }
      }

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

  const canEditTaskProperties = (
    userRole === 'project_manager' ||
    userRole === 'project_owner' ||
    (task?.assignee_id === userId && !isCollaborator)
  );

  const canEditDescription =
    userRole === 'project_manager' ||
    userRole === 'project_owner';

  const delayStatus = getDelayStatus();
  const typingUserNames = Array.from(typingUsers)
    .map(uid => userProfiles.get(uid))
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className={cn(
        "p-0 flex flex-col overflow-hidden gap-0 transition-all duration-300",
        isFullscreen ? "max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] animate-fade-in" : "max-w-4xl w-4xl max-h-[90vh] h-[90vh]"
      )}>
        <div className="p-6 pb-4 border-b flex-shrink-0 relative">
          <div className="absolute top-6 right-6 flex items-center gap-1 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="h-9 w-9"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4 text-green-500" /> : <Maximize2 className="h-4 w-4 text-green-500" />}
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Close">
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </DialogClose>
          </div>

          <div className="flex items-start gap-3 pr-24">
            <div className={`w-1 h-12 ${getStatusColor(task.status)} rounded-full flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-foreground">{clientName}</h2>
                {task.revision_count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Revision {task.revision_count}
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
              </div>
              <p className="text-lg text-muted-foreground mt-1">{task.task_name}</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 border-b flex-shrink-0 bg-background flex items-center justify-between">
            <TabsList className="bg-transparent">
              <TabsTrigger value="details" className="gap-2">
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="discussion" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Discussion
              </TabsTrigger>
              <TabsTrigger value="revisions" className="gap-2">
                <GitBranch className="h-4 w-4" />
                Revisions
                {task.revision_count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">
                    {task.revision_count}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <Clock className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            {(userRole === 'project_manager' || userRole === 'project_owner') && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (onDuplicate && task) {
                      onDuplicate({
                        task_name: task.task_name,
                        client_id: task.client_id,
                        project_id: task.project_id,
                        assignee_id: task.assignee_id,
                        urgency: task.urgency,
                        reference_link_1: task.reference_link_1,
                        reference_link_2: task.reference_link_2,
                        reference_link_3: task.reference_link_3,
                        reference_image: task.reference_image,
                        notes: task.notes,
                      });
                    }
                  }}
                  title="Duplicate task"
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditDialog(true)}
                  title="Edit task"
                  className="gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="details" className="flex-1 overflow-y-auto m-0">
            <div className="p-6 space-y-6">
              {/* Team Row - Task Owner, Collaborators, Project Manager in one row */}
              <div className="flex flex-wrap items-start gap-4 pb-4 border-b">
                {/* Task Owner */}
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Task Owner
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={assigneeAvatar || undefined} alt={assigneeName} />
                      <AvatarFallback className="text-xs">
                        {assigneeName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{assigneeName}</p>
                      {assigneeCreativeTitle && (
                        <p className="text-xs text-muted-foreground">{assigneeCreativeTitle}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collaborators (Read-only display) */}
                {collaborators.length > 0 && (
                  <div className="flex-1 min-w-[180px]">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <UsersRound className="h-3.5 w-3.5" />
                      Collaborators
                    </Label>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {collaborators.map((collab: any) => (
                        <div key={collab.user_id} className="flex items-center gap-1.5">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={collab.profiles?.avatar_url || undefined} alt={collab.profiles?.full_name} />
                            <AvatarFallback className="text-xs">
                              {(collab.profiles?.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{collab.profiles?.full_name || "Unknown"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Manager */}
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Wand2 className="h-3.5 w-3.5 text-purple-500" />
                    Project Manager
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={assignedByAvatar || undefined} alt={assignedByName} />
                      <AvatarFallback className="text-xs">
                        {assignedByName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{assignedByName}</p>
                      {assignedByCreativeTitle && (
                        <p className="text-xs text-muted-foreground">{assignedByCreativeTitle}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Timeline */}
              <TaskTimeline
                dateAssigned={task.date}
                deadline={task.deadline || new Date().toISOString()}
                dateSubmitted={task.actual_delivery}
              />

              {/* Time Tracking Display */}
              {timeRecords.length > 0 && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Time Tracked
                    </Label>
                  </div>
                  <TimeTrackingBadge records={timeRecords} variant="card" showStatus />
                </div>
              )}

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-blue-500" />
                    Status
                  </Label>
                  {(() => {
                    const availableStatuses = getAvailableStatuses(userRole, task.status || "");
                    const canChange = canEditTaskProperties && (userRole !== "team_member" || availableStatuses.length > 0);

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
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Urgency
                  </Label>
                  {!canEditTaskProperties || !canChangeUrgency(userRole) ? (
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

              {!canEditTaskProperties && isCollaborator && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Collaborators cannot modify task status, urgency, or deadline
                </p>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                  {canEditDescription && (
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
                  )}
                </div>
                {canEditDescription && editingNotes ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Enter description..."
                      className="text-sm min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleNotesSave}>Save</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingNotes(false);
                          setNotesValue(task.notes || "");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap overflow-y-auto pr-2">
                    {task.notes || "No description"}
                  </div>
                )}
                {!canEditDescription && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Only project managers and owners can edit the task description.
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

              {task.reference_image && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reference Image</Label>
                  <div className="mt-1">
                    <a
                      href={task.reference_image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <img
                        src={task.reference_image}
                        alt="Task reference"
                        className="max-w-sm max-h-60 rounded border hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </a>
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

              {/* Edit History */}
              {editHistory.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Edit History</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {editHistory.map((edit: any) => (
                      <div key={edit.id} className="border-l-2 border-primary/30 pl-3 py-2 text-sm">
                        <p className="font-medium text-foreground">{edit.change_description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By {edit.profiles?.full_name} • {format(new Date(edit.edited_at), 'PPp')}
                        </p>
                        {edit.old_value && edit.new_value && (
                          <div className="mt-1 text-xs">
                            <span className="line-through text-muted-foreground">{edit.old_value.substring(0, 50)}</span>
                            <span className="mx-1">→</span>
                            <span className="text-foreground">{edit.new_value.substring(0, 50)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SMO Posted Flag - Visible to task owner and collaborators */}
              {(task.assignee_id === userId || isCollaborator) && (
                <div className="pt-4 border-t">
                  <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg">
                    <Checkbox
                      id="is_posted"
                      checked={isPosted}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        (async () => {
                          try {
                            const { error } = await supabase
                              .from("tasks")
                              .update({
                                is_posted: isChecked,
                                posted_at: isChecked ? new Date().toISOString() : null,
                                posted_by: isChecked ? userId : null,
                              })
                              .eq("id", task.id);

                            if (error) throw error;
                            setIsPosted(isChecked);
                            toast.success(isChecked ? "Marked as posted" : "Unmarked as posted");
                            fetchTaskDetails();
                          } catch (error: any) {
                            toast.error("Failed to update posted status");
                          }
                        })();
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor="is_posted" className="text-sm font-medium cursor-pointer">
                        Posted to Social Media
                      </Label>
                      {task.posted_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Posted on {format(new Date(task.posted_at), 'PPp')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Asset Submission Area - Visible to task owner and collaborators */}
              {(task.assignee_id === userId || isCollaborator) && task.status !== "Approved" && (
                <div className="pt-4 border-t">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Submit Assets</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="url"
                      placeholder="Enter asset link (Google Drive, Dropbox, etc.)"
                      value={assetLink}
                      onChange={(e) => setAssetLink(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={async () => {
                        if (!assetLink.trim()) {
                          toast.error("Please enter an asset link");
                          return;
                        }
                        try {
                          const { error } = await supabase
                            .from("tasks")
                            .update({
                              asset_link: assetLink,
                              actual_delivery: new Date().toISOString().split('T')[0],
                              status: "In Approval",
                            })
                            .eq("id", task.id);

                          if (error) throw error;
                          toast.success("Assets submitted successfully!");
                          fetchTaskDetails();
                        } catch (error: any) {
                          toast.error("Failed to submit assets");
                        }
                      }}
                      disabled={!assetLink.trim()}
                    >
                      Submit Assets
                    </Button>
                  </div>
                </div>
              )}

              {/* Request Revision Button - Visible to PM/PO when asset link exists */}
              {(userRole === 'project_manager' || userRole === 'project_owner') && task.asset_link && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => setShowRequestRevision(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <FileEdit className="h-4 w-4 mr-2" />
                    Request Revision
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="revisions" className="flex-1 overflow-y-auto m-0 p-6">
            <TaskRevisions
              taskId={task.id}
              revisionCount={task.revision_count}
              status={task.status}
              userRole={userRole}
              userId={userId}
              onRevisionRequested={fetchTaskDetails}
            />
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto m-0 p-6">
            <TaskHistory taskId={task.id} />
          </TabsContent>

          <TabsContent value="discussion" className="flex-1 flex flex-col m-0 min-h-0">
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="p-4 space-y-2">
                {comments.map((comment, index) => (
                  <div key={comment.id} className="flex gap-3 p-3 rounded-lg border-b last:border-b-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.profiles?.avatar_url || undefined} alt={comment.profiles?.full_name} />
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
                          {(userRole === 'project_owner' || comment.user_id === userId) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                              onClick={() => handleDeleteComment(comment.id)}
                              title="Delete comment"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className={isOnlyEmojis(comment.message) ? "text-5xl leading-tight" : "text-sm"}>
                        <MessageWithMentions text={comment.message} currentUserName={currentUserName} />
                      </p>
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
                                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${userReacted
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
                <MentionInput
                  value={newComment}
                  onChange={(value) => {
                    setNewComment(value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  placeholder="Type a message... (use @ to mention)"
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
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Request Revision Dialog */}
      <RequestRevisionDialog
        open={showRequestRevision}
        onOpenChange={setShowRequestRevision}
        taskId={task?.id || ""}
        revisionCount={task?.revision_count || 0}
        onRevisionRequested={() => {
          fetchTaskDetails();
          fetchComments();
        }}
      />

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <EditTaskTab
            task={task}
            onTaskUpdated={() => {
              fetchTaskDetails();
              setShowEditDialog(false);
              toast.success("Task updated successfully");
            }}
            userRole={userRole}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}