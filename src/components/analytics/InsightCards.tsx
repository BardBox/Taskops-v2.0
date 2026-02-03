import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Info, Lightbulb, AlertTriangle } from "lucide-react";

interface TrendInsight {
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
    value?: string;
}

interface InsightCardsProps {
    insights: TrendInsight[];
    className?: string;
}

export function InsightCards({ insights, className }: InsightCardsProps) {
    if (insights.length === 0) {
        return (
            <div className={cn("text-center py-8 text-muted-foreground", className)}>
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Not enough data to generate insights</p>
            </div>
        );
    }

    const getInsightConfig = (type: 'positive' | 'negative' | 'neutral') => {
        switch (type) {
            case 'positive':
                return {
                    icon: TrendingUp,
                    bgClass: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/30',
                    iconClass: 'text-emerald-500 bg-emerald-500/20',
                    valueClass: 'text-emerald-500',
                };
            case 'negative':
                return {
                    icon: TrendingDown,
                    bgClass: 'from-red-500/15 to-red-600/5 border-red-500/30',
                    iconClass: 'text-red-500 bg-red-500/20',
                    valueClass: 'text-red-500',
                };
            default:
                return {
                    icon: Info,
                    bgClass: 'from-blue-500/15 to-blue-600/5 border-blue-500/30',
                    iconClass: 'text-blue-500 bg-blue-500/20',
                    valueClass: 'text-blue-500',
                };
        }
    };

    return (
        <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
            {insights.map((insight, index) => {
                const config = getInsightConfig(insight.type);
                const Icon = config.icon;

                return (
                    <Card
                        key={index}
                        className={cn(
                            "border bg-gradient-to-br transition-all duration-300 hover:shadow-md",
                            config.bgClass
                        )}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className={cn("rounded-lg p-2 shrink-0", config.iconClass)}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                                        {insight.value && (
                                            <span className={cn("font-bold text-lg tabular-nums", config.valueClass)}>
                                                {insight.value}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        {insight.description}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
