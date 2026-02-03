import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Activity, Coffee, Clock } from "lucide-react";

interface LiveActivityItem {
    userId: string;
    userName: string;
    avatarUrl: string | null;
    taskId: string | null;
    taskName: string | null;
    clientName: string | null;
    startedAt: string;
    status: 'working' | 'break';
}

interface LiveActivityFeedProps {
    activities: LiveActivityItem[];
    className?: string;
}

export function LiveActivityFeed({ activities, className }: LiveActivityFeedProps) {
    if (activities.length === 0) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-12 text-muted-foreground", className)}>
                <Activity className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">No active sessions right now</p>
                <p className="text-xs mt-1">Team members will appear here when they clock in</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-3", className)}>
            {activities.map((activity) => (
                <div
                    key={activity.userId}
                    className={cn(
                        "flex items-center gap-4 p-3 rounded-xl transition-all duration-300",
                        "bg-gradient-to-r border",
                        activity.status === 'working'
                            ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                            : "from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
                    )}
                >
                    {/* Avatar with status ring */}
                    <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-offset-background transition-shadow"
                            style={{
                                boxShadow: activity.status === 'working'
                                    ? '0 0 12px rgba(16, 185, 129, 0.4)'
                                    : '0 0 12px rgba(245, 158, 11, 0.4)'
                            }}
                        >
                            <AvatarImage src={activity.avatarUrl || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                {activity.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                            activity.status === 'working' ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                        )} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{activity.userName}</span>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-[10px] px-1.5 py-0",
                                    activity.status === 'working'
                                        ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                                        : "border-amber-500/50 text-amber-600 dark:text-amber-400"
                                )}
                            >
                                {activity.status === 'working' ? (
                                    <><Activity className="h-2.5 w-2.5 mr-1" />Working</>
                                ) : (
                                    <><Coffee className="h-2.5 w-2.5 mr-1" />Break</>
                                )}
                            </Badge>
                        </div>
                        {activity.taskName && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {activity.taskName}
                                {activity.clientName && <span className="opacity-60"> • {activity.clientName}</span>}
                            </p>
                        )}
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(activity.startedAt), { addSuffix: false })}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
