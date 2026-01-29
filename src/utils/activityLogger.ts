import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ActivityType = 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Note' | 'Proposal' | 'System' | 'StageChange';

export const logActivity = async (
    leadId: string,
    type: ActivityType,
    summary: string,
    note?: string,
    nextFollowUp?: Date,
    agenda?: string
) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        let finalSummary = note ? `${summary}\n${note}` : summary;

        // Append follow-up details if present
        if (nextFollowUp) {
            const dateStr = nextFollowUp.toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const agendaStr = agenda ? ` - ${agenda}` : '';
            finalSummary += `\n\n📅 Follow-up: ${dateStr}${agendaStr}`;
        }

        const { error: activityError } = await supabase
            .from('sales_activities')
            .insert({
                lead_id: leadId,
                type,
                summary: finalSummary,
                created_by: user.id
            });

        if (activityError) throw activityError;

        // If follow up is scheduled, update the lead
        if (nextFollowUp) {
            const { error: leadError } = await supabase
                .from('leads')
                .update({
                    next_follow_up: nextFollowUp.toISOString(),
                    next_follow_up_agenda: agenda
                })
                .eq('id', leadId);

            if (leadError) throw leadError;
        }

        return true;
    } catch (error) {
        console.error('Error logging activity:', error);
        toast.error("Failed to log activity");
        return false;
    }
};
