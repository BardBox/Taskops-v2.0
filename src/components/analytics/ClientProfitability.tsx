import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
    Tooltip, Cell, ReferenceLine
} from "recharts";
import { Building2 } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface ClientData {
    clientId: string;
    clientName: string;
    estimatedHours: number;
    actualHours: number;
}

interface ClientProfitabilityProps {
    data: ClientData[];
    className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClientProfitability({ data, className }: ClientProfitabilityProps) {
    const chartData = useMemo(() => {
        return data
            .map(client => ({
                name: client.clientName.length > 12
                    ? client.clientName.substring(0, 12) + '...'
                    : client.clientName,
                fullName: client.clientName,
                estimated: Math.round(client.estimatedHours * 10) / 10,
                actual: Math.round(client.actualHours * 10) / 10,
                variance: Math.round((client.actualHours - client.estimatedHours) * 10) / 10,
                variancePercent: client.estimatedHours > 0
                    ? Math.round(((client.actualHours - client.estimatedHours) / client.estimatedHours) * 100)
                    : 0,
            }))
            .sort((a, b) => b.actual - a.actual)
            .slice(0, 8);
    }, [data]);

    const totals = useMemo(() => {
        return data.reduce(
            (acc, client) => ({
                estimated: acc.estimated + client.estimatedHours,
                actual: acc.actual + client.actualHours,
            }),
            { estimated: 0, actual: 0 }
        );
    }, [data]);

    if (data.length === 0) {
        return (
            <div className={cn("text-center py-8 text-muted-foreground", className)}>
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No client data available</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Summary */}
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-primary/50" />
                        <span className="text-muted-foreground">Estimated</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-primary" />
                        <span className="text-muted-foreground">Actual</span>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">
                    Total: {Math.round(totals.actual)}h / {Math.round(totals.estimated)}h budgeted
                </div>
            </div>

            {/* Chart */}
            <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={true} vertical={false} />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v}h`}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={75}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                            formatter={(value: number, name: string) => [
                                `${value}h`,
                                name === 'estimated' ? 'Budgeted' : 'Actual'
                            ]}
                            labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                        />
                        <Bar dataKey="estimated" fill="hsl(var(--primary))" opacity={0.3} radius={[0, 4, 4, 0]} barSize={12} />
                        <Bar dataKey="actual" radius={[0, 4, 4, 0]} barSize={12}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.variance > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Client List with Variance */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50">
                {chartData.slice(0, 4).map((client) => (
                    <div key={client.name} className="text-center p-2 rounded-md bg-muted/30">
                        <p className="text-xs text-muted-foreground truncate">{client.fullName}</p>
                        <p className={cn(
                            "text-sm font-semibold",
                            client.variance > 0 ? "text-red-500" : "text-emerald-500"
                        )}>
                            {client.variance > 0 ? '+' : ''}{client.variancePercent}%
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
