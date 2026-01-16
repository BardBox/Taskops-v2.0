import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    LogOut, Settings, Sliders, Home, Shield, User, BarChart3,
    Hexagon, CheckCircle2, TrendingUp, Info, Menu, ChevronLeft, ChevronRight,
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoleBadge } from "@/components/RoleBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
    userRole?: string;
    className?: string;
}

export function Sidebar({ userRole, className }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(true);
    const [userName, setUserName] = useState<string>("");
    const [avatarUrl, setAvatarUrl] = useState<string>("");

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data } = await supabase
                    .from("profiles")
                    .select("full_name, avatar_url")
                    .eq("id", session.user.id)
                    .single();

                if (data) {
                    setUserName(data.full_name);
                    setAvatarUrl(data.avatar_url || "");
                }
            }
        };
        fetchProfile();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        toast.success("Signed out successfully");
        navigate("/auth");
    };

    const hasAdminAccess = userRole === "project_owner" || userRole === "project_manager";
    const initials = userName
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U";

    const NavItem = ({
        icon: Icon,
        label,
        path,
        isActive,
        className,
        onClick
    }: {
        icon: any,
        label: string,
        path?: string,
        isActive?: boolean,
        className?: string,
        onClick?: () => void
    }) => (
        <Button
            variant="ghost"
            className={cn(
                "w-full justify-start gap-3 relative group overflow-hidden transition-all duration-300",
                collapsed ? "px-2" : "px-4",
                isActive
                    ? "bg-primary/10 text-primary hover:bg-primary/15 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                className
            )}
            onClick={onClick || (() => path && navigate(path))}
            title={collapsed ? label : undefined}
        >
            <Icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive ? "text-primary" : "")} />
            <span className={cn(
                "transition-all duration-300 transform",
                collapsed ? "opacity-0 translate-x-10 absolute" : "opacity-100 translate-x-0 relative"
            )}>
                {label}
            </span>

            {/* Tooltip-like popup for collapsed mode could be added here if 'title' attribute isn't enough */}
        </Button>
    );

    return (
        <div
            className={cn(
                "h-screen bg-background border-r border-border/50 flex flex-col transition-all duration-300 ease-in-out relative z-40 shadow-sm",
                collapsed ? "w-16" : "w-64",
                className
            )}
        >
            {/* Header / Toggle */}
            <div className="h-14 flex items-center justify-between px-3 border-b border-border/50">
                <div className={cn("flex items-center gap-2 overflow-hidden transition-all duration-300", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                    <img
                        src="/bardbox-logo.png"
                        alt="BardBox"
                        className="h-6 w-auto object-contain"
                    />
                    <span className="font-bold text-sm tracking-tight whitespace-nowrap">TaskOPS</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 ml-auto"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2">
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
                        path="/dashboard?view=growth"
                        isActive={location.search.includes("view=growth")}
                    />
                )}

                <div className="my-2 border-t border-border/50" />

                <NavItem
                    icon={User}
                    label="My Profile"
                    path="/profile"
                    isActive={location.pathname === "/profile"}
                />
                <NavItem
                    icon={Users}
                    label="My Team"
                    path="/team"
                    isActive={location.pathname === "/team"}
                />
                <NavItem
                    icon={Hexagon}
                    label="The Creative Hive"
                    path="/hive"
                    isActive={location.pathname === "/hive"}
                />
                <NavItem
                    icon={BarChart3}
                    label="Analytics"
                    path="/analytics"
                    isActive={location.pathname.startsWith("/analytics")}
                />
                <NavItem
                    icon={CheckCircle2}
                    label="Posting Status"
                    path="/posting-status"
                    isActive={location.pathname === "/posting-status"}
                />

                <div className="my-2 border-t border-border/50" />

                <NavItem
                    icon={Sliders}
                    label="Preferences"
                    path="/preferences"
                    isActive={location.pathname === "/preferences"}
                />
                <NavItem
                    icon={Info}
                    label="About"
                    path="/about"
                    isActive={location.pathname === "/about"}
                />

                {hasAdminAccess && (
                    <>
                        <div className="my-2 border-t border-border/50" />
                        <NavItem
                            icon={Shield}
                            label="Admin Panel"
                            path="/admin"
                            isActive={location.pathname.startsWith("/admin")}
                        />
                    </>
                )}
            </div>

            {/* Footer / User Profile */}
            <div className="p-3 border-t border-border/50">
                <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}>
                    <div className="relative group cursor-pointer" onClick={() => navigate("/profile")}>
                        <Avatar className="h-9 w-9 transition-transform hover:scale-105">
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
                        <span className="text-sm font-medium truncate">{userName || "User"}</span>
                        {userRole && (
                            <span className="text-[10px] text-muted-foreground capitalize">
                                {userRole.replace(/_/g, ' ')}
                            </span>
                        )}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8 text-muted-foreground hover:text-destructive transition-colors ml-auto",
                            collapsed ? "hidden" : "flex"
                        )}
                        onClick={handleSignOut}
                        title="Sign Out"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
