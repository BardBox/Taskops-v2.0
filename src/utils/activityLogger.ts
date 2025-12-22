import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ActivityType = 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Note' | 'Proposal' | 'System' | 'StageChange';

export const logActivity = async (
    leadId: string,
    type: ActivityType,
    summary: string,
    note?: string
) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const finalSummary = note ? `${summary} - ${note}` : summary;

        const { error } = await supabase
            .from('sales_activities')
            .insert({
                lead_id: leadId,
                type,
                summary: finalSummary,
                created_by: user.id
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error logging activity:', error);
        toast.error("Failed to log activity");
        return false;
    }
};
