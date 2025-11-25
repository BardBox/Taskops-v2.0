import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageCircle, Send, Pencil, Trash2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { EmojiPicker } from "./EmojiPicker";
import { MentionInput } from "./MentionInput";
import { MessageWithMentions } from "./MessageWithMentions";
import { getUserIdsFromMentions } from "@/utils/mentionParser";
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

interface ChatMessage {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
  reactions: Array<{
    emoji: string;
    user_id: string;
    count: number;
  }>;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "👏"];

const TeamChat = () => {
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        // Fetch current user's name
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) setCurrentUserName(data.full_name);
          });
      }
    });
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ["teamChat"],
    queryFn: async () => {
      const { data: messagesData, error: messagesError } = await supabase
        .from("team_chat_messages")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      const { data: reactionsData } = await supabase
        .from("chat_reactions")
        .select("*");

      const messagesWithReactions = messagesData?.map((msg) => {
        const msgReactions = reactionsData?.filter((r) => r.message_id === msg.id) || [];
        const groupedReactions = msgReactions.reduce((acc, reaction) => {
          const existing = acc.find((r) => r.emoji === reaction.emoji);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ emoji: reaction.emoji, user_id: reaction.user_id, count: 1 });
          }
          return acc;
        }, [] as Array<{ emoji: string; user_id: string; count: number }>);

        return {
          ...msg,
          reactions: groupedReactions,
        };
      });

      return messagesWithReactions as ChatMessage[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("team_chat_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_chat_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["teamChat"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_reactions",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["teamChat"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: newMessage, error } = await supabase
        .from("team_chat_messages")
        .insert({
          message,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Get mentioned user IDs
      const mentionedUserIds = await getUserIdsFromMentions(message, supabase);
      
      // Create notifications for mentioned users
      if (mentionedUserIds.length > 0 && newMessage) {
        const { data: currentUserProfile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();

        const notifications = mentionedUserIds
          .filter((id) => id !== user.id) // Don't notify yourself
          .map((userId) => ({
            user_id: userId,
            type: "mention",
            title: "You were mentioned",
            message: `${currentUserProfile?.full_name || "Someone"} mentioned you in team chat`,
            actor_id: user.id,
            actor_name: currentUserProfile?.full_name || null,
            actor_avatar_url: currentUserProfile?.avatar_url || null,
          }));

        if (notifications.length > 0) {
          await supabase.from("notifications").insert(notifications);
        }
      }
    },
    onSuccess: () => {
      setMessage("");
      setMentionedUsers([]);
      queryClient.invalidateQueries({ queryKey: ["teamChat"] });
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const addReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("chat_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });

      if (error) {
        if (error.message?.includes("duplicate")) {
          const { error: deleteError } = await supabase
            .from("chat_reactions")
            .delete()
            .eq("message_id", messageId)
            .eq("user_id", user.id)
            .eq("emoji", emoji);

          if (deleteError) throw deleteError;
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamChat"] });
    },
  });

  const updateMessage = useMutation({
    mutationFn: async ({ messageId, newText }: { messageId: string; newText: string }) => {
      const { error } = await supabase
        .from("team_chat_messages")
        .update({ message: newText })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamChat"] });
      toast.success("Message updated");
      setEditingMessageId(null);
      setEditingText("");
    },
    onError: () => {
      toast.error("Failed to update message");
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("team_chat_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamChat"] });
      toast.success("Message deleted");
      setDeleteMessageId(null);
    },
    onError: () => {
      toast.error("Failed to delete message");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage.mutate();
    }
  };

  const startEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.message);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const saveEdit = (messageId: string) => {
    if (editingText.trim()) {
      updateMessage.mutate({ messageId, newText: editingText });
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  const handleMention = (userId: string, userName: string) => {
    setMentionedUsers((prev) => [...prev, userId]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <CardTitle>Team Chat</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg) => {
                const isOwnMessage = msg.user_id === currentUserId;
                const isEditing = editingMessageId === msg.id;
                
                // Safety check for profiles
                if (!msg.profiles) return null;
                
                return (
                  <div key={msg.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={msg.profiles.avatar_url || undefined} />
                      <AvatarFallback>{msg.profiles.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          {msg.profiles.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), "p")}
                        </span>
                      </div>
                      
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => saveEdit(msg.id)}
                            disabled={!editingText.trim()}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={cancelEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <div
                            className={`inline-block px-4 py-2 rounded-lg ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent text-accent-foreground"
                            }`}
                          >
                            <p className="text-sm">
                              <MessageWithMentions 
                                text={msg.message} 
                                currentUserName={currentUserName}
                              />
                            </p>
                          </div>
                          {isOwnMessage && (
                            <div className="flex gap-1 mt-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => startEdit(msg)}
                                title="Edit message"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive/80"
                                onClick={() => setDeleteMessageId(msg.id)}
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {msg.reactions.map((reaction, idx) => (
                          <button
                            key={idx}
                            onClick={() => addReaction.mutate({ messageId: msg.id, emoji: reaction.emoji })}
                            className="px-2 py-1 text-xs bg-accent/50 rounded-full hover:bg-accent transition-colors"
                          >
                            {reaction.emoji} {reaction.count}
                          </button>
                        ))}
                        <div className="flex gap-1">
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => addReaction.mutate({ messageId: msg.id, emoji })}
                              className="w-6 h-6 text-xs hover:bg-accent rounded-full transition-colors opacity-50 hover:opacity-100"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <MentionInput
              value={message}
              onChange={setMessage}
              onMention={handleMention}
              placeholder="Type @ to mention someone..."
            />
            <EmojiPicker onSelect={handleEmojiSelect} />
            <Button type="submit" disabled={!message.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>

          <AlertDialog open={!!deleteMessageId} onOpenChange={() => setDeleteMessageId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Message</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this message? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMessageId && deleteMessage.mutate(deleteMessageId)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamChat;
