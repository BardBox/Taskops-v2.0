import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
    className?: string;
}

export function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = 'default',
    className,
}: StatsCardProps) {
    const variantStyles = {
        default: {
            container: 'from-slate-500/10 to-slate-600/5 border-slate-500/20',
            icon: 'text-slate-500 bg-slate-500/10',
            accent: 'text-slate-500',
        },
        primary: {
            container: 'from-primary/10 to-primary/5 border-primary/20',
            icon: 'text-primary bg-primary/10',
            accent: 'text-primary',
        },
        success: {
            container: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
            icon: 'text-emerald-500 bg-emerald-500/10',
            accent: 'text-emerald-500',
        },
        warning: {
            container: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
            icon: 'text-amber-500 bg-amber-500/10',
            accent: 'text-amber-500',
        },
        danger: {
            container: 'from-red-500/10 to-red-600/5 border-red-500/20',
            icon: 'text-red-500 bg-red-500/10',
            accent: 'text-red-500',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
                "bg-gradient-to-br backdrop-blur-sm",
                "hover:shadow-lg hover:shadow-primary/5",
                styles.container,
                className
            )}
        >
            {/* Background glow effect */}
            <div className={cn(
                "absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-20",
                styles.accent.replace('text-', 'bg-')
            )} />

            <div className="relative flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {title}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tabular-nums">{value}</span>
                        {trend && (
                            <span className={cn(
                                "text-xs font-medium",
                                trend.isPositive ? "text-emerald-500" : "text-red-500"
                            )}>
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    )}
                </div>

                <div className={cn(
                    "rounded-lg p-2.5 transition-transform hover:scale-110",
                    styles.icon
                )}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}
