import { useEffect, useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trophy, Loader2 } from "lucide-react";
import { InspirationCard } from "@/components/inspiration/InspirationCard";
import { AddInspirationDialog } from "@/components/inspiration/AddInspirationDialog";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Inspiration {
    id: string;
    type: 'link' | 'image' | 'video';
    content_url: string;
    description: string;
    tags: string[];
    created_at: string;
    user_id: string;
    profiles: { full_name: string; avatar_url: string };
    inspiration_reactions: any[];
}

export const InspirationBoard = () => {
    const [items, setItems] = useState<Inspiration[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Leaderboard data
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id);
        });
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("inspirations" as any)
                .select(`
                *,
                profiles(full_name, avatar_url),
                inspiration_reactions(emoji, user_id)
            `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setItems(data || []);
            calculateLeaderboard(data || []);
        } catch (error) {
            console.error("Error fetching inspirations:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateLeaderboard = (data: any[]) => {
        const counts: Record<string, number> = {};
        const users: Record<string, any> = {};

        data.forEach(item => {
            counts[item.user_id] = (counts[item.user_id] || 0) + 1;
            if (item.profiles) users[item.user_id] = item.profiles;
        });

        const sorted = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([uid, count]) => ({
                user_id: uid,
                count,
                profile: users[uid]
            }));

        setLeaderboard(sorted);
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = (item.description || "").toLowerCase().includes(search.toLowerCase()) ||
            (item.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase());
        const matchesTag = selectedTag ? item.tags?.includes(selectedTag) : true;
        return matchesSearch && matchesTag;
    });

    const popularTags = Array.from(new Set(items.flatMap(i => i.tags || []))).slice(0, 8);

    return (
        <MainLayout>
            <div className="p-4 md:p-8 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Inspiration Board</h1>
                        <p className="text-muted-foreground">Share and discover creative ideas, trends, and designs.</p>
                    </div>
                    <Button onClick={() => setAddDialogOpen(true)} className="shrink-0">
                        <Plus className="mr-2 h-4 w-4" /> Add Inspiration
                    </Button>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Main Feed */}
                    <div className="flex-1 space-y-6">
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search inspirations..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-wrap gap-2 flex-1">
                                <Button
                                    variant={selectedTag === null ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setSelectedTag(null)}
                                >
                                    All
                                </Button>
                                {popularTags.map(tag => (
                                    <Button
                                        key={tag}
                                        variant={selectedTag === tag ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                                    >
                                        #{tag}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                <p>No inspiration found. Be the first to share something!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredItems.map(item => (
                                    <InspirationCard
                                        key={item.id}
                                        item={item}
                                        currentUserId={userId || ""}
                                        onRefresh={fetchData}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Leaderboard */}
                    <div className="w-full lg:w-80 shrink-0 space-y-6">
                        <div className="bg-card rounded-lg border p-4">
                            <h3 className="font-semibold flex items-center gap-2 mb-4">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                Top Contributors
                            </h3>
                            <div className="space-y-4">
                                {leaderboard.map((entry, index) => (
                                    <div key={entry.user_id} className="flex items-center gap-3">
                                        <span className={`text-sm font-bold w-4 text-center ${index < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {index + 1}
                                        </span>
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={entry.profile?.avatar_url} />
                                            <AvatarFallback>{entry.profile?.full_name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{entry.profile?.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{entry.count} contributions</p>
                                        </div>
                                    </div>
                                ))}
                                {leaderboard.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No contributions yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {userId && (
                <AddInspirationDialog
                    open={addDialogOpen}
                    onOpenChange={setAddDialogOpen}
                    onSuccess={fetchData}
                    userId={userId}
                />
            )}
        </MainLayout>
    );
};

export default InspirationBoard;
