import { useState, useEffect, useRef } from "react";
import { format, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, Edit2, History, Loader2, Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StandupNote {
    id?: string;
    morning_notes: string;
    evening_notes: string;
    morning_author_id?: string;
    evening_author_id?: string;
    morning_author?: { full_name: string, avatar_url: string };
    evening_author?: { full_name: string, avatar_url: string };
    updated_at?: string;
}

interface VersionHistory {
    id: string;
    content: string;
    created_at: string;
    edited_by: string;
    editor?: { full_name: string, avatar_url: string };
}

export const DailyStandup = () => {
    const [userRole, setUserRole] = useState<string>("");
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState<StandupNote>({ morning_notes: "", evening_notes: "" });
    const [isEditingMorning, setIsEditingMorning] = useState(false);
    const [isEditingEvening, setIsEditingEvening] = useState(false);
    const [saving, setSaving] = useState(false);

    // History State
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historySection, setHistorySection] = useState<'morning' | 'evening'>('morning');
    const [historyVersions, setHistoryVersions] = useState<VersionHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Auto-resize refs
    const morningRef = useRef<HTMLTextAreaElement>(null);
    const eveningRef = useRef<HTMLTextAreaElement>(null);

    const isManager = userRole === 'project_manager' || userRole === 'project_owner';

    const handlePreviousDay = () => {
        const prevDay = new Date(currentDate);
        prevDay.setDate(prevDay.getDate() - 1);
        setCurrentDate(prevDay);
    };

    const handleNextDay = () => {
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        setCurrentDate(nextDay);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Disable if typing in active element (textarea, input, etc.)
            // Disable if typing in active element (textarea, input, etc.)
            const target = document.activeElement as HTMLElement;
            if (
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'INPUT' ||
                target.isContentEditable ||
                target.closest("[role='listbox']") ||
                target.closest("[role='combobox']") ||
                target.closest("[role='menu']")
            ) return;

            if (e.key === 'ArrowLeft') {
                handlePreviousDay();
            } else if (e.key === 'ArrowRight') {
                handleNextDay();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentDate]);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
                if (data) setUserRole(data.role);
            }
            fetchNotes(currentDate);
        };
        init();
    }, []);

    // Fetch notes when date changes
    useEffect(() => {
        fetchNotes(currentDate);
        // Reset edit modes on date change
        setIsEditingMorning(false);
        setIsEditingEvening(false);
    }, [currentDate]);




    const fetchNotes = async (date: Date) => {
        setLoading(true);
        const dateStr = format(date, 'yyyy-MM-dd');

        try {
            const { data, error } = await supabase
                .from('daily_standups' as any)
                .select('*')
                .eq('date', dateStr)
                .maybeSingle();

            if (data) {
                let mAuthor = null;
                let eAuthor = null;

                if ((data as any).morning_author_id) {
                    const { data: ma } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', (data as any).morning_author_id).single();
                    mAuthor = ma;
                }
                if ((data as any).evening_author_id) {
                    const { data: ea } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', (data as any).evening_author_id).single();
                    eAuthor = ea;
                }

                setNotes({
                    ...data as any,
                    morning_notes: (data as any).morning_notes || "",
                    evening_notes: (data as any).evening_notes || "",
                    morning_author: mAuthor,
                    evening_author: eAuthor
                });
            } else {
                setNotes({ morning_notes: "", evening_notes: "" });
            }
        } catch (error) {
            console.error("Error fetching notes:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (section: 'morning' | 'evening') => {
        if (!notes.id) return;
        setLoadingHistory(true);
        setHistorySection(section);
        setHistoryOpen(true);

        try {
            const { data, error } = await supabase
                .from('daily_standup_versions' as any)
                .select('id, content, created_at, edited_by')
                .eq('standup_id', notes.id)
                .eq('section', section)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch profiles for editors
            const versionsWithProfiles = await Promise.all((data || []).map(async (v: any) => {
                let editor = null;
                if (v.edited_by) {
                    const { data: p } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', v.edited_by).single();
                    editor = p;
                }
                return { ...v, editor };
            }));

            setHistoryVersions(versionsWithProfiles);
        } catch (error) {
            console.error("Error fetching history:", error);
            toast.error("Failed to load history");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSave = async (section: 'morning' | 'evening') => {
        setSaving(true);
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const updateData: any = {
                date: dateStr,
                updated_at: new Date().toISOString()
            };

            const content = section === 'morning' ? notes.morning_notes : notes.evening_notes;

            if (section === 'morning') {
                updateData.morning_notes = content;
                updateData.morning_author_id = user.id;
            } else {
                updateData.evening_notes = content;
                updateData.evening_author_id = user.id;
            }

            // 1. Upsert Main Record
            const { data: savedRecord, error: upsertError } = await supabase
                .from('daily_standups' as any)
                .upsert(updateData, { onConflict: 'date' })
                .select()
                .single();

            if (upsertError) throw upsertError;

            // 2. Insert Version History
            if (savedRecord) {
                await supabase.from('daily_standup_versions' as any).insert({
                    standup_id: (savedRecord as any).id,
                    section: section,
                    content: content,
                    edited_by: user.id
                });
            }

            toast.success("Saved successfully");

            // Refresh logic handled by fetch or local update
            // Just update local state to reflect author changes immediately if needed
            // But fetchNotes() is safer to get DB state
            fetchNotes(currentDate);

            if (section === 'morning') setIsEditingMorning(false);
            else setIsEditingEvening(false);

        } catch (error: any) {
            console.error("Error saving:", error);
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const renderSection = (section: 'morning' | 'evening') => {
        const isMorning = section === 'morning';
        const isEditing = isMorning ? isEditingMorning : isEditingEvening;
        const setEditing = isMorning ? setIsEditingMorning : setIsEditingEvening;
        const noteContent = isMorning ? notes.morning_notes : notes.evening_notes;
        const author = isMorning ? notes.morning_author : notes.evening_author;
        const textAreaRef = isMorning ? morningRef : eveningRef;
        const themeColor = isMorning ? "text-amber-500" : "text-indigo-500";
        const borderColor = isMorning ? "border-amber-200 dark:border-amber-800/50" : "border-indigo-200 dark:border-indigo-800/50";
        const iconBg = isMorning ? "bg-amber-100 dark:bg-amber-900/30" : "bg-indigo-100 dark:bg-indigo-900/30";

        return (
            <Card className={cn("h-full border-2 transition-all duration-200", borderColor, "bg-card/50 backdrop-blur-sm")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl", iconBg, themeColor)}>
                            {isMorning ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">{isMorning ? "Morning Intentions" : "Evening Reflections"}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                                {isMorning ? "What's your main focus today?" : "What did you accomplish?"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {notes.id && !isEditing && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-muted"
                                onClick={() => fetchHistory(section)}
                                title="View History"
                            >
                                <History className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        )}

                        {isManager && !isEditing && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full gap-2 text-xs font-medium border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                                onClick={() => setEditing(true)}
                            >
                                <Edit2 className="h-3 w-3" />
                                {noteContent ? "Edit" : "Create"}
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="h-full min-h-[300px] flex flex-col relative">
                    {isEditing ? (
                        <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-200">
                            <div className="flex items-center gap-1 mb-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-full hover:bg-background/40"
                                    onClick={() => {
                                        const textarea = textAreaRef.current;
                                        if (!textarea) return;
                                        const start = textarea.selectionStart;
                                        const end = textarea.selectionEnd;
                                        const text = textarea.value;
                                        const before = text.substring(0, start);
                                        const selection = text.substring(start, end);
                                        const after = text.substring(end);
                                        const newText = `${before}**${selection || "Bold"}**${after}`;
                                        setNotes(prev => ({ ...prev, [isMorning ? 'morning_notes' : 'evening_notes']: newText }));
                                        setTimeout(() => {
                                            textarea.focus();
                                            textarea.setSelectionRange(start + 2, end + 2 + (selection ? 0 : 4));
                                        }, 0);
                                    }}
                                    title="Bold"
                                >
                                    <span className="font-bold">B</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-full hover:bg-background/40"
                                    onClick={() => {
                                        const textarea = textAreaRef.current;
                                        if (!textarea) return;
                                        const start = textarea.selectionStart;
                                        const end = textarea.selectionEnd;
                                        const text = textarea.value;
                                        const before = text.substring(0, start);
                                        const selection = text.substring(start, end);
                                        const after = text.substring(end);
                                        const newText = `${before}_${selection || "Italic"}_${after}`;
                                        setNotes(prev => ({ ...prev, [isMorning ? 'morning_notes' : 'evening_notes']: newText }));
                                        setTimeout(() => {
                                            textarea.focus();
                                            textarea.setSelectionRange(start + 1, end + 1 + (selection ? 0 : 6));
                                        }, 0);
                                    }}
                                    title="Italic"
                                >
                                    <span className="italic">I</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 font-mono text-xs rounded-full hover:bg-background/40"
                                    onClick={() => {
                                        const textarea = textAreaRef.current;
                                        if (!textarea) return;
                                        const start = textarea.selectionStart;
                                        const end = textarea.selectionEnd;
                                        const text = textarea.value;
                                        const before = text.substring(0, start);
                                        const after = text.substring(end);
                                        // Find start of current line to insert handle nicely? simplified for now: just insert at cursor
                                        const newText = `${before}\n- ${after}`;
                                        setNotes(prev => ({ ...prev, [isMorning ? 'morning_notes' : 'evening_notes']: newText }));
                                        setTimeout(() => {
                                            textarea.focus();
                                            textarea.setSelectionRange(start + 3, start + 3);
                                        }, 0);
                                    }}
                                    title="Bullet List"
                                >
                                    •
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 font-mono text-xs rounded-full hover:bg-background/40"
                                    onClick={() => {
                                        const textarea = textAreaRef.current;
                                        if (!textarea) return;
                                        const start = textarea.selectionStart;
                                        const end = textarea.selectionEnd;
                                        const text = textarea.value;
                                        const before = text.substring(0, start);
                                        const after = text.substring(end);
                                        const newText = `${before}\n1. ${after}`;
                                        setNotes(prev => ({ ...prev, [isMorning ? 'morning_notes' : 'evening_notes']: newText }));
                                        setTimeout(() => {
                                            textarea.focus();
                                            textarea.setSelectionRange(start + 4, start + 4);
                                        }, 0);
                                    }}
                                    title="Numbered List"
                                >
                                    1.
                                </Button>
                            </div>
                            <AutoResizeTextarea
                                ref={textAreaRef}
                                value={noteContent}
                                onChange={(e) => setNotes(prev => ({
                                    ...prev,
                                    [isMorning ? 'morning_notes' : 'evening_notes']: e.target.value
                                }))}
                                placeholder={isMorning ? "List your top priorities..." : "Reflect on your day..."}
                                className="flex-1 min-h-[200px] border-none focus-visible:ring-0 bg-transparent p-4 text-base leading-relaxed resize-none"
                            />
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setEditing(false);
                                        // Reset to original if needed? Or just keep draft? keeping draft for now.
                                        fetchNotes(currentDate); // Revert changes
                                    }}
                                    className="rounded-full"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleSave(section)}
                                    disabled={saving}
                                    className={cn("rounded-full border shadow-sm transition-all", isMorning ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20")}
                                >
                                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col justify-between">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                {noteContent ? (
                                    <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
                                        {noteContent}
                                    </p>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/40 gap-2 select-none">
                                        <div className="p-3 rounded-full bg-muted/20">
                                            <Edit2 className="h-6 w-6" />
                                        </div>
                                        <p>No entry details yet</p>
                                    </div>
                                )}
                            </div>

                            {/* Author Footer */}
                            {noteContent && author && (
                                <div className="mt-8 pt-4 border-t border-border/30 flex justify-between items-center text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6 ring-2 ring-background">
                                            <AvatarImage src={author.avatar_url} />
                                            <AvatarFallback>{author.full_name[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{author.full_name}</span>
                                    </div>
                                    <span className="flex items-center gap-1 opacity-70">
                                        <Clock className="h-3 w-3" />
                                        {notes.updated_at ? format(new Date(notes.updated_at), 'h:mm a') : 'Just now'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <MainLayout>
            <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto dark:bg-black/20 min-h-screen">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Daily Standup
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Track your team's pulse and progress.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-full border shadow-sm backdrop-blur">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={handlePreviousDay}
                            title="Previous Day (Left Arrow)"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[200px] justify-start text-left font-normal border-none shadow-none bg-transparent hover:bg-muted/50 rounded-full h-8 px-3",
                                        !currentDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                    {currentDate ? format(currentDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={currentDate}
                                    onSelect={(date) => date && setCurrentDate(date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={handleNextDay}
                            title="Next Day (Right Arrow)"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>

                        {!isSameDay(currentDate, new Date()) && (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-full px-3 h-8 text-xs ml-1"
                                onClick={() => setCurrentDate(new Date())}
                            >
                                Jump to Today
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-12 w-12 animate-spin text-primary/30" />
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-8 items-start h-full">
                        {renderSection('morning')}
                        {renderSection('evening')}
                    </div>
                )}

                {/* History Dialog */}
                <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Version History
                            </DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[400px] pr-4">
                            {loadingHistory ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : historyVersions.length > 0 ? (
                                <div className="space-y-6">
                                    {historyVersions.map((version) => (
                                        <div key={version.id} className="relative pl-6 pb-6 border-l border-border last:pb-0">
                                            <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="font-medium text-foreground">{format(new Date(version.created_at), 'MMM d, h:mm a')}</span>
                                                    <span>{version.editor?.full_name}</span>
                                                </div>
                                                <div className="p-3 bg-muted/40 rounded-lg text-sm mt-2 border border-border/50 whitespace-pre-wrap">
                                                    {version.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No history available for this section.
                                </div>
                            )}
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
};

export default DailyStandup;
