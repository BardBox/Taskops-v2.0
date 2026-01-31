import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, Heart, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface InspirationCardProps {
    item: any;
    currentUserId: string;
    onRefresh: () => void;
}

export function InspirationCard({ item, currentUserId, onRefresh }: InspirationCardProps) {
    const [reacting, setReacting] = useState(false);

    const isOwner = item.user_id === currentUserId;

    const handleDelete = async () => {
        const { error } = await supabase.from("inspirations" as any).delete().eq("id", item.id);
        if (error) {
            toast.error("Failed to delete");
        } else {
            toast.success("Deleted successfully");
            onRefresh();
        }
    };

    const handleReaction = async (emoji: string) => {
        if (reacting) return;
        setReacting(true);
        try {
            const { error } = await supabase.from("inspiration_reactions" as any).insert({
                inspiration_id: item.id,
                user_id: currentUserId,
                emoji
            });

            // Loop: Check for duplicate key violation to toggle (delete) instead
            if (error && error.code === '23505') {
                await supabase.from("inspiration_reactions" as any)
                    .delete()
                    .eq("inspiration_id", item.id)
                    .eq("user_id", currentUserId)
                    .eq("emoji", emoji);
            }

            onRefresh();
        } catch (e) {
            console.error(e);
        } finally {
            setReacting(false);
        }
    };

    // Group reactions
    const reactions = item.inspiration_reactions || [];
    const groupedReactions = reactions.reduce((acc: any, r: any) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
    }, {});

    const myReactions = reactions.filter((r: any) => r.user_id === currentUserId).map((r: any) => r.emoji);

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="p-3 flex flex-row items-center gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={item.profiles?.avatar_url} />
                    <AvatarFallback>{item.profiles?.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
                </div>
                {isOwner && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>

            <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                {item.type === 'image' && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <img src={item.content_url} alt="Inspiration" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" />
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                            <img src={item.content_url} alt="Full view" className="w-full h-auto max-h-[90vh] object-contain rounded-md" />
                        </DialogContent>
                    </Dialog>
                )}
                {item.type === 'video' && (
                    <video src={item.content_url} controls className="w-full h-full object-cover" />
                )}
                {item.type === 'link' && (
                    <div className="p-4 text-center">
                        <ExternalLink className="h-10 w-10 mx-auto mb-2 text-primary" />
                        <a href={item.content_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all line-clamp-3">
                            {item.content_url}
                        </a>
                    </div>
                )}
            </div>

            <CardContent className="p-3">
                {item.description && (
                    <p className="text-sm mb-2">{item.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                    {item.tags?.map((tag: string) => (
                        <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-md">#{tag}</span>
                    ))}
                </div>
            </CardContent>

            <CardFooter className="p-3 pt-0 flex gap-2 overflow-x-auto no-scrollbar">
                {/* Simple Emoji Picker */}
                <Button variant="ghost" size="sm" className="h-7 px-2 rounded-full bg-muted/50" onClick={() => handleReaction('🔥')}>
                    🔥
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 rounded-full bg-muted/50" onClick={() => handleReaction('❤️')}>
                    ❤️
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 rounded-full bg-muted/50" onClick={() => handleReaction('💡')}>
                    💡
                </Button>

                {Object.entries(groupedReactions).map(([emoji, count]) => (
                    <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${myReactions.includes(emoji) ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground'}`}
                    >
                        <span>{emoji}</span>
                        <span>{count as number}</span>
                    </button>
                ))}
            </CardFooter>
        </Card>
    );
}
