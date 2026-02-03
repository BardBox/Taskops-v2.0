import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export interface AnomalySession {
    id: string;
    userId: string;
    userName: string;
    avatarUrl?: string;
    sessionDate: Date;
    durationMinutes: number;
    anomalyType: "too_long" | "too_short" | "unusual_time" | "gap";
    severity: "low" | "medium" | "high";
    description: string;
}

interface AnomalyDetectionProps {
    sessions: AnomalySession[];
    className?: string;
    maxItems?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AnomalyDetection({
    sessions,
    className,
    maxItems = 5
}: AnomalyDetectionProps) {
    const sortedSessions = useMemo(() => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return [...sessions]
            .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
            .slice(0, maxItems);
    }, [sessions, maxItems]);

    const getAnomalyConfig = (type: AnomalySession["anomalyType"]) => {
        switch (type) {
            case "too_long":
                return {
                    icon: TrendingUp,
                    label: "Unusually Long",
                    color: "text-amber-500"
                };
            case "too_short":
                return {
                    icon: TrendingDown,
                    label: "Very Short",
                    color: "text-blue-500"
                };
            case "unusual_time":
                return {
                    icon: Clock,
                    label: "Unusual Hours",
                    color: "text-purple-500"
                };
            case "gap":
                return {
                    icon: AlertTriangle,
                    label: "Session Gap",
                    color: "text-red-500"
                };
            default:
                return {
                    icon: AlertTriangle,
                    label: "Anomaly",
                    color: "text-muted-foreground"
                };
        }
    };

    const getSeverityBadge = (severity: AnomalySession["severity"]) => {
        switch (severity) {
            case "high":
                return <Badge variant="destructive" className="text-xs">High</Badge>;
            case "medium":
                return <Badge className="text-xs bg-amber-500">Medium</Badge>;
            case "low":
                return <Badge variant="secondary" className="text-xs">Low</Badge>;
        }
    };

    if (sessions.length === 0) {
        return (
            <div className={cn("text-center py-8", className)}>
                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-emerald-500/50" />
                <p className="text-sm text-muted-foreground">No anomalies detected</p>
                <p className="text-xs text-muted-foreground mt-1">All sessions are within normal range</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-3", className)}>
            {sortedSessions.map((session) => {
                const config = getAnomalyConfig(session.anomalyType);
                const Icon = config.icon;

                return (
                    <div
                        key={session.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                        <div className={cn("mt-0.5 p-1.5 rounded-full bg-muted", config.color)}>
                            <Icon className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={session.avatarUrl} />
                                    <AvatarFallback className="text-[10px]">
                                        {session.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium truncate">{session.userName}</span>
                                {getSeverityBadge(session.severity)}
                            </div>

                            <p className="text-xs text-muted-foreground line-clamp-2">
                                {session.description}
                            </p>

                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span className={config.color}>{config.label}</span>
                                <span>•</span>
                                <span>{Math.round(session.durationMinutes / 60 * 10) / 10}h session</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(session.sessionDate, { addSuffix: true })}</span>
                            </div>
                        </div>
                    </div>
                );
            })}

            {sessions.length > maxItems && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                    +{sessions.length - maxItems} more anomalies
                </p>
            )}
        </div>
    );
}
