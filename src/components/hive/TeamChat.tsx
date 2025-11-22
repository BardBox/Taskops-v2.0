import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageCircle, Send, Smile } from "lucide-react";
import { format } from "date-fns";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
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

      const { error } = await supabase.from("team_chat_messages").insert({
        message,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage.mutate();
    }
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
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={msg.profiles.avatar_url || undefined} />
                      <AvatarFallback>{msg.profiles.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${isOwnMessage ? "text-right" : ""}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          {msg.profiles.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), "p")}
                        </span>
                      </div>
                      <div
                        className={`inline-block px-4 py-2 rounded-lg ${
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                      </div>
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
                        {!isOwnMessage && (
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
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!message.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamChat;
