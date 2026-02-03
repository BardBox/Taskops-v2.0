import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Monitor, Coffee, MonitorOff } from "lucide-react";

interface TeamMember {
    userId: string;
    userName: string;
    avatarUrl: string | null;
    currentStatus: 'working' | 'break' | 'offline';
    currentTask: string | null;
    efficiencyScore: number;
}

interface TeamStatusGridProps {
    members: TeamMember[];
    className?: string;
}

export function TeamStatusGrid({ members, className }: TeamStatusGridProps) {
    const getStatusConfig = (status: 'working' | 'break' | 'offline') => {
        switch (status) {
            case 'working':
                return {
                    icon: Monitor,
                    label: 'Working',
                    bgClass: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10',
                    borderClass: 'border-emerald-500/30 hover:border-emerald-500/60',
                    iconClass: 'text-emerald-500',
                    ringClass: 'ring-emerald-500/50',
                };
            case 'break':
                return {
                    icon: Coffee,
                    label: 'On Break',
                    bgClass: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10',
                    borderClass: 'border-amber-500/30 hover:border-amber-500/60',
                    iconClass: 'text-amber-500',
                    ringClass: 'ring-amber-500/50',
                };
            default:
                return {
                    icon: MonitorOff,
                    label: 'Offline',
                    bgClass: 'bg-gradient-to-br from-slate-500/10 to-slate-600/5',
                    borderClass: 'border-slate-500/20 hover:border-slate-500/40',
                    iconClass: 'text-slate-400',
                    ringClass: 'ring-slate-400/30',
                };
        }
    };

    const getEfficiencyColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500';
        if (score >= 60) return 'text-amber-500';
        return 'text-red-500';
    };

    if (members.length === 0) {
        return (
            <div className={cn("flex items-center justify-center py-8 text-muted-foreground text-sm", className)}>
                No team members found
            </div>
        );
    }

    return (
        <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3", className)}>
            {members.map((member) => {
                const config = getStatusConfig(member.currentStatus);
                const StatusIcon = config.icon;

                return (
                    <div
                        key={member.userId}
                        className={cn(
                            "relative p-4 rounded-xl border transition-all duration-300 cursor-default",
                            "backdrop-blur-sm",
                            config.bgClass,
                            config.borderClass,
                        )}
                    >
                        {/* Status indicator dot */}
                        <div className={cn(
                            "absolute top-2 right-2 h-2 w-2 rounded-full",
                            member.currentStatus === 'working' && "bg-emerald-500 animate-pulse",
                            member.currentStatus === 'break' && "bg-amber-500",
                            member.currentStatus === 'offline' && "bg-slate-400",
                        )} />

                        <div className="flex flex-col items-center text-center">
                            {/* Avatar */}
                            <Avatar className={cn("h-12 w-12 mb-2 ring-2 ring-offset-2 ring-offset-background", config.ringClass)}>
                                <AvatarImage src={member.avatarUrl || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                                    {member.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>

                            {/* Name */}
                            <span className="font-medium text-sm truncate w-full">{member.userName.split(' ')[0]}</span>

                            {/* Status */}
                            <div className={cn("flex items-center gap-1 mt-1", config.iconClass)}>
                                <StatusIcon className="h-3 w-3" />
                                <span className="text-xs">{config.label}</span>
                            </div>

                            {/* Efficiency Score */}
                            <div className={cn("text-xs font-mono mt-2", getEfficiencyColor(member.efficiencyScore))}>
                                {member.efficiencyScore}% eff
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
