import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    LogOut, Settings, Sliders, Home, Shield, User, BarChart3,
    Hexagon, CheckCircle2, TrendingUp, Info, Menu, ChevronLeft,
    Users, Moon, Sun, Monitor, Activity, Clock3, DoorOpen, BellOff, Plane, Smile
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/ThemeProvider";
import { useFocusMode } from "@/contexts/FocusModeContext";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface SidebarProps {
    userRole?: string;
    className?: string;
    collapsed?: boolean;
    onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({ userRole, className, collapsed: controlledCollapsed, onCollapseChange }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [internalCollapsed, setInternalCollapsed] = useState(true);

    const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

    const setCollapsed = (val: boolean | ((prev: boolean) => boolean)) => {
        const newVal = typeof val === 'function' ? val(collapsed) : val;
        setInternalCollapsed(newVal);
        onCollapseChange?.(newVal);
    };

    const [userName, setUserName] = useState<string>("");
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const { theme, setTheme } = useTheme();

    // Personal Status State
    const [userId, setUserId] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [mood, setMood] = useState<string | null>(null);
    const [statusOpen, setStatusOpen] = useState(false);
    const [moodOpen, setMoodOpen] = useState(false);

    const [statuses, setStatuses] = useState<string[]>([
        "Available", "Busy", "Out of Office", "Do Not Disturb", "On Leave"
    ]);
    const [moods, setMoods] = useState<string[]>([
        "😄 Happy", "😎 Cool", "🤔 Thoughtful", "😴 Tired", "🔥 On Fire",
        "🎯 Focused", "🎉 Excited", "😌 Relaxed", "💪 Motivated", "🤯 Overwhelmed"
    ]);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                const { data } = await supabase
                    .from("profiles")
                    .select("full_name, avatar_url, status, mood")
                    .eq("id", session.user.id)
                    .single();

                if (data) {
                    setUserName(data.full_name);
                    setAvatarUrl(data.avatar_url || "");
                    setStatus(data.status);
                    setMood(data.mood);
                }
                fetchOptions();
            }
        };
        fetchProfile();
    }, []);

    const fetchOptions = async () => {
        const { data: settings } = await supabase
            .from("system_settings")
            .select("setting_key, setting_value")
            .in("setting_key", ["status_options", "mood_options"]);

        if (settings) {
            settings.forEach((setting) => {
                let value = setting.setting_value;
                if (typeof value === 'string') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        console.error("Failed to parse setting:", setting.setting_key, e);
                    }
                }
                if (setting.setting_key === "status_options" && Array.isArray(value)) setStatuses(value);
                else if (setting.setting_key === "mood_options" && Array.isArray(value)) setMoods(value);
            });
        }
    };

    const updateStatus = async (newStatus: string) => {
        if (!userId) return;
        const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", userId);
        if (!error) {
            setStatus(newStatus);
            setStatusOpen(false);
            toast.success(`Status updated to ${newStatus}`);
        }
    };

    const updateMood = async (newMood: string) => {
        if (!userId) return;
        const { error } = await supabase.from("profiles").update({ mood: newMood }).eq("id", userId);
        if (!error) {
            setMood(newMood);
            setMoodOpen(false);
            toast.success("Mood updated");
        }
    };

    const getStatusIcon = (status: string | null) => {
        switch (status) {
            case "Available": return Activity;
            case "Busy": return Clock3;
            case "Out of Office": return DoorOpen;
            case "Do Not Disturb": return BellOff;
            case "On Leave": return Plane;
            default: return Activity;
        }
    };

    const getStatusDotColor = (status: string | null) => {
        if (!status) return "bg-gray-500";
        switch (status) {
            case "Available": return "bg-green-500";
            case "Busy": return "bg-red-500";
            case "Out of Office": return "bg-orange-500";
            case "Do Not Disturb": return "bg-purple-500";
            case "On Leave": return "bg-gray-500";
            default: return "bg-gray-500";
        }
    };

    const hasAdminAccess = userRole === "project_owner" || userRole === "project_manager";
    const initials = userName?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";

    interface NavItemProps {
        icon: React.ElementType;
        label: string;
        path?: string;
        isActive?: boolean;
        onClick?: () => void;
        className?: string;
    }

    const NavItem = ({ icon: Icon, label, path, isActive, onClick, className }: NavItemProps) => (
        <Button
            variant="ghost"
            className={cn(
                "w-full justify-start gap-3 relative group overflow-hidden transition-all duration-200",
                collapsed ? "px-0 justify-center" : "px-3",
                isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
                className
            )}
            onClick={onClick || (() => path && navigate(path))}
            title={collapsed ? label : undefined}
        >
            {/* Active Indicator (Royal Yellow Circle) */}
            {isActive && (
                <div className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 bg-[#F6BE00] rounded-full transition-all duration-300",
                    collapsed ? "w-1.5 h-1.5 left-1/2 -ml-[3px] top-[80%]" : "w-1.5 h-1.5 left-0" // Center dot below icon when collapsed, left when expanded
                )} />
            )}

            <Icon className={cn("h-5 w-5 flex-shrink-0 transition-colors z-10", isActive ? "text-[#F6BE00]" : "group-hover:text-foreground")} />

            <span className={cn(
                "transition-all duration-300 transform whitespace-nowrap z-10",
                collapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-auto"
            )}>
                {label}
            </span>
        </Button>
    );

    const { isFocusMode } = useFocusMode();
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={cn(
                "h-screen bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col transition-all duration-300 ease-in-out z-40",

                // Normal Mode
                !isFocusMode && "sticky top-0 border-r border-border/50 shadow-sm",
                !isFocusMode && (collapsed ? "w-[60px]" : "w-[210px]"),

                // Focus Mode
                isFocusMode && "fixed left-0 top-0",
                isFocusMode && !isHovered && "w-2 opacity-50 bg-transparent border-none shadow-none delay-200", // Trigger strip with slight delay on hide
                isFocusMode && isHovered && "opacity-100 shadow-2xl border-r border-border/50",
                isFocusMode && isHovered && (collapsed ? "w-[60px]" : "w-[210px]"),

                className
            )}
            onMouseEnter={() => isFocusMode && setIsHovered(true)}
            onMouseLeave={() => isFocusMode && setIsHovered(false)}
        >
            {/* Inner Content Wrapper - Hides content when acting as a trigger strip */}
            <div className={cn(
                "flex flex-col h-full w-full overflow-hidden transition-opacity duration-200",
                isFocusMode && !isHovered ? "opacity-0 invisible" : "opacity-100 visible"
            )}>

                {/* Header / Toggle */}
                <div className="h-14 flex items-center justify-between px-3 border-b border-border/50 flex-shrink-0">
                    <div className={cn("flex items-center gap-2 overflow-hidden transition-all duration-300", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                        <img src="/bardbox-logo.png" alt="BardBox" className="h-6 w-auto object-contain dark:invert" />
                        <span className="font-bold text-sm tracking-tight whitespace-nowrap">TaskOPS 2.0</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 ml-auto text-muted-foreground hover:text-foreground"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2 scrollbar-none">
                    {/* Ops Center Dashboard */}
                    {userRole !== "sales_team" && (
                        <NavItem
                            icon={Home}
                            label="Dashboard"
                            path="/dashboard"
                            isActive={location.pathname === "/dashboard" && !location.search.includes("view=growth")}
                        />
                    )}

                    {/* Growth Engine */}
                    {(userRole === "project_owner" || userRole === "business_head" || userRole === "sales_team") && (
                        <NavItem
                            icon={TrendingUp}
                            label="Growth Engine"
                            path="/growth"
                            isActive={location.pathname.startsWith("/growth")}
                        />
                    )}

                    <div className="my-2 border-t border-border/50" />

                    <NavItem icon={User} label="My Profile" path="/profile" isActive={location.pathname === "/profile"} />
                    <NavItem icon={Users} label="My Team" path="/team" isActive={location.pathname === "/team"} />
                    <NavItem icon={Hexagon} label="The Hive" path="/hive" isActive={location.pathname === "/hive"} />
                    <NavItem icon={BarChart3} label="Analytics" path="/analytics" isActive={location.pathname.startsWith("/analytics")} />
                    <NavItem icon={CheckCircle2} label="Posting Status" path="/posting-status" isActive={location.pathname === "/posting-status"} />

                    <div className="my-2 border-t border-border/50" />

                    <NavItem icon={Sliders} label="Preferences" path="/preferences" isActive={location.pathname === "/preferences"} />
                    <NavItem icon={Info} label="About" path="/about" isActive={location.pathname === "/about"} />

                    {hasAdminAccess && (
                        <>
                            <div className="my-2 border-t border-border/50" />
                            <NavItem icon={Shield} label="Admin Panel" path="/admin" isActive={location.pathname.startsWith("/admin")} />
                        </>
                    )}
                </div>

                {/* Bottom Controls (Personal & Theme) */}
                <div className="p-2 flex flex-col gap-2 border-t border-border/50 flex-shrink-0">
                    {/* Theme Toggle - Compressed Row */}
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start gap-3 relative group overflow-hidden transition-all duration-200",
                            collapsed ? "px-0 justify-center h-10 w-10 mx-auto" : "px-3 w-full",
                            "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        title="Toggle Theme"
                    >
                        {theme === "dark" ?
                            <Sun className="h-5 w-5 flex-shrink-0 transition-colors group-hover:text-[#F6BE00]" /> :
                            <Moon className="h-5 w-5 flex-shrink-0 transition-colors group-hover:text-[#F6BE00]" />
                        }
                        <span className={cn(
                            "transition-all duration-300 transform whitespace-nowrap",
                            collapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-auto"
                        )}>
                            {theme === "dark" ? "Dark Mode" : "Light Mode"}
                        </span>
                    </Button>

                    {/* Status & Mood - Compressed or Expanded */}
                    <div className={cn("flex flex-col gap-1 transition-all pt-2", collapsed ? "items-center" : "items-stretch px-2")}>
                        {/* Status */}
                        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className={cn("justify-start gap-3 relative group", collapsed ? "h-8 w-8 justify-center px-0" : "w-full px-2")}>
                                    {(() => {
                                        const Icon = getStatusIcon(status);
                                        return <Icon className={cn("h-4 w-4 flex-shrink-0",
                                            status === "Available" ? "text-green-500" :
                                                status === "Busy" ? "text-red-500" :
                                                    status === "Out of Office" ? "text-orange-500" : "text-muted-foreground"
                                        )} />;
                                    })()}
                                    {!collapsed && <span className="text-sm truncate">{status || "Set Status"}</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="start" side="right">
                                <div className="space-y-1">
                                    {statuses.map((s) => (
                                        <Button key={s} variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => updateStatus(s)}>
                                            <div className={`h-2 w-2 rounded-full ${getStatusDotColor(s)}`} />
                                            {s}
                                        </Button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Mood */}
                        <Popover open={moodOpen} onOpenChange={setMoodOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className={cn("justify-start gap-3", collapsed ? "h-8 w-8 justify-center px-0" : "w-full px-2")}>
                                    {mood ? <span className="text-base leading-none flex-shrink-0">{mood.split(" ")[0]}</span> : <Smile className="h-4 w-4 flex-shrink-0" />}
                                    {!collapsed && <span className="text-sm truncate">{mood ? mood.substring(mood.indexOf(" ") + 1) : "Set Mood"}</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2" align="start" side="right">
                                <div className="grid grid-cols-2 gap-1">
                                    {moods.map((m) => (
                                        <Button key={m} variant="ghost" size="sm" className="justify-start text-sm h-auto py-2 px-2" onClick={() => updateMood(m)}>
                                            {m}
                                        </Button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>


                {/* Footer / User Profile */}
                <div className="p-3 border-t border-border/50 bg-muted/20 flex-shrink-0">
                    <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}>
                        <div className="relative group cursor-pointer" onClick={() => navigate("/profile")}>
                            <Avatar className="h-8 w-8 transition-transform hover:scale-105 border border-border">
                                <AvatarImage src={avatarUrl} alt={userName} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        <div className={cn(
                            "flex flex-col overflow-hidden transition-all duration-300",
                            collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                        )}>
                            <span className="text-xs font-semibold truncate">{userName || "User"}</span>
                            {userRole && (
                                <span className="text-[10px] text-muted-foreground capitalize">
                                    {userRole.replace(/_/g, ' ')}
                                </span>
                            )}
                        </div>

                        {!collapsed && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors ml-auto"
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    toast.success("Signed out");
                                    navigate("/auth");
                                }}
                                title="Sign Out"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
