import { useEffect, useState } from 'react';
import { Lead } from '@/components/sales/LeadTable';
import { toast } from 'sonner';
import { isBefore, isToday, addDays, startOfDay } from 'date-fns';

interface FollowUpStats {
    overdue: Lead[];
    today: Lead[];
    upcoming: Lead[]; // Next 3 days
    total: number;
}

export const useFollowUpReminders = (leads: Lead[]) => {
    const [stats, setStats] = useState<FollowUpStats>({
        overdue: [],
        today: [],
        upcoming: [],
        total: 0,
    });
    const [hasShownNotification, setHasShownNotification] = useState(false);

    useEffect(() => {
        if (!leads || leads.length === 0) return;

        const now = startOfDay(new Date());
        const threeDaysFromNow = addDays(now, 3);

        const overdue: Lead[] = [];
        const today: Lead[] = [];
        const upcoming: Lead[] = [];

        leads.forEach((lead) => {
            // Skip Won/Lost leads
            if (lead.status === 'Won' || lead.status === 'Lost') return;

            if (!lead.next_follow_up) return;

            const followUpDate = startOfDay(new Date(lead.next_follow_up));

            if (isBefore(followUpDate, now)) {
                overdue.push(lead);
            } else if (isToday(followUpDate)) {
                today.push(lead);
            } else if (followUpDate <= threeDaysFromNow) {
                upcoming.push(lead);
            }
        });

        setStats({
            overdue,
            today,
            upcoming,
            total: overdue.length + today.length + upcoming.length,
        });

        // Show notification on page load (once)
        if (!hasShownNotification && (overdue.length > 0 || today.length > 0)) {
            const message = [];
            if (overdue.length > 0) {
                message.push(`${overdue.length} overdue follow-up${overdue.length > 1 ? 's' : ''}`);
            }
            if (today.length > 0) {
                message.push(`${today.length} due today`);
            }

            toast.error(`🔔 ${message.join(', ')}`, {
                duration: 5000,
                action: {
                    label: 'View',
                    onClick: () => {
                        // Scroll to first overdue/today item
                        const firstLead = overdue[0] || today[0];
                        const element = document.getElementById(`lead-${firstLead.id}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
            });

            setHasShownNotification(true);
        }
    }, [leads, hasShownNotification]);

    const getFollowUpStatus = (lead: Lead): 'overdue' | 'today' | 'upcoming' | 'future' | null => {
        if (lead.status === 'Won' || lead.status === 'Lost') return null;
        if (!lead.next_follow_up) return null;

        const followUpDate = startOfDay(new Date(lead.next_follow_up));
        const now = startOfDay(new Date());
        const threeDaysFromNow = addDays(now, 3);

        if (isBefore(followUpDate, now)) return 'overdue';
        if (isToday(followUpDate)) return 'today';
        if (followUpDate <= threeDaysFromNow) return 'upcoming';
        return 'future';
    };

    return {
        stats,
        getFollowUpStatus,
    };
};
