import { cn } from "@/lib/utils";

interface EfficiencyGaugeProps {
    value: number; // 0-100
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    label?: string;
    className?: string;
}

export function EfficiencyGauge({
    value,
    size = 'md',
    showLabel = true,
    label = 'Efficiency',
    className
}: EfficiencyGaugeProps) {
    const clampedValue = Math.min(100, Math.max(0, value));

    // Calculate the stroke dasharray for the progress arc
    const radius = size === 'sm' ? 35 : size === 'md' ? 45 : 55;
    const strokeWidth = size === 'sm' ? 6 : size === 'md' ? 8 : 10;
    const circumference = 2 * Math.PI * radius;
    const progress = (clampedValue / 100) * circumference;

    // SVG dimensions
    const svgSize = (radius + strokeWidth) * 2;
    const center = svgSize / 2;

    // Color based on value
    const getColor = () => {
        if (clampedValue >= 80) return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' }; // emerald
        if (clampedValue >= 60) return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' }; // amber
        return { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' }; // red
    };

    const colors = getColor();

    const fontSizes = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-3xl',
    };

    return (
        <div className={cn("flex flex-col items-center", className)}>
            <div className="relative">
                <svg
                    width={svgSize}
                    height={svgSize}
                    className="transform -rotate-90"
                    style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
                >
                    {/* Background circle */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-muted/20"
                    />

                    {/* Progress arc */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - progress}
                        className="transition-all duration-1000 ease-out"
                    />

                    {/* Gradient definition */}
                    <defs>
                        <linearGradient id={`gauge-gradient-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={colors.stroke} stopOpacity="1" />
                            <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.6" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Center value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("font-bold tabular-nums", fontSizes[size])}>
                        {Math.round(clampedValue)}
                    </span>
                    <span className="text-xs text-muted-foreground">%</span>
                </div>
            </div>

            {showLabel && (
                <span className="mt-2 text-xs text-muted-foreground font-medium">{label}</span>
            )}
        </div>
    );
}
