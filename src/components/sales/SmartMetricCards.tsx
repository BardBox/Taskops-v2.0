import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "./LeadTable";
import { convertToINR, formatCurrency, ExchangeRates } from "@/utils/currency";
import { Activity, Percent, AlertCircle, CheckCircle } from "lucide-react";

interface SmartMetricCardsProps {
    leads: Lead[];
    exchangeRates: ExchangeRates;
}

export const SmartMetricCards = ({ leads, exchangeRates }: SmartMetricCardsProps) => {
    // 1. Total Pipeline Value (INR)
    const totalPipelineValue = leads.reduce((sum, lead) => {
        if (lead.status === 'Won' || lead.status === 'Lost') return sum;
        return sum + convertToINR(lead.expected_value || 0, lead.currency || 'INR', exchangeRates);
    }, 0);

    // 2. Active Leads Count
    const activeLeads = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length;

    // 3. Overdue Follow-ups
    const overdueLeads = leads.filter(l => {
        if (l.status === 'Won' || l.status === 'Lost') return false;
        if (!l.next_follow_up) return false;
        return new Date(l.next_follow_up) < new Date(new Date().setHours(0, 0, 0, 0));
    }).length;

    // 4. Win Rate (Conversion)
    const wonLeads = leads.filter(l => l.status === 'Won').length;
    const lostLeads = leads.filter(l => l.status === 'Lost').length;
    const closedLeads = wonLeads + lostLeads;
    const winRate = closedLeads > 0 ? Math.round((wonLeads / closedLeads) * 100) : 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pipeline Value (Active)</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Across {activeLeads} active deals
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{winRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {wonLeads} won / {closedLeads} closed
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Follow-ups Due</CardTitle>
                    <AlertCircle className={`h-4 w-4 ${overdueLeads > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${overdueLeads > 0 ? 'text-red-600' : ''}`}>
                        {overdueLeads}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Requires immediate attention
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Won Revenue (Total)</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                            leads.reduce((sum, lead) => {
                                if (lead.status !== 'Won') return sum;
                                return sum + convertToINR(lead.expected_value || 0, lead.currency || 'INR', exchangeRates);
                            }, 0)
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Total revenue secured
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
