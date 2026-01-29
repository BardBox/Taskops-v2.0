import React, { useState } from 'react';
import {
    Phone, MessageSquare, Mail, Calendar,
    FileText, ArrowRight, Settings, CheckCircle,
    Clock, AlertCircle, X, Loader2, Pencil, Globe, ChevronDown
} from 'lucide-react';
import { Lead } from './LeadTable';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { ActivityLogDialog } from './ActivityLogDialog';
import { ScheduleFollowUpDialog } from './ScheduleFollowUpDialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/utils/activityLogger";

export interface Activity {
    id: string;
    type: 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Note' | 'Proposal' | 'System' | 'StageChange';
    summary: string;
    outcome_tag?: string;
    created_at: string;
    note?: string;
    status?: 'Overdue' | 'Done';
    overdueDays?: number;
}

interface SalesOpsPanelProps {
    lead: Lead;
    events: Activity[];
    onClose: () => void;
    onRefresh: () => void;
    onEdit: (lead: Lead) => void;
    onViewContact: (contactId: string) => void;
    onMarkWon: (lead: Lead) => void;
    userMap: Record<string, string>;
}

// ... (omitted code)

const getCurrencySymbol = (currency: string | null) => {
    switch (currency) {
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'INR': return '₹';
        default: return '$';
    }
};

const TimelineItem = ({ event }: { event: Activity }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getIcon = (type: string) => {
        switch (type) {
            case 'Call': return Phone;
            case 'Email': return Mail;
            case 'Meeting': return Calendar;
            case 'WhatsApp': return MessageSquare;
            case 'Note': return FileText;
            case 'Proposal': return FileText;
            case 'System': return Settings;
            case 'StageChange': return ArrowRight;
            default: return CheckCircle;
        }
    };
    const Icon = getIcon(event.type);

    // Combine summary and note effectively, or just rely on summary since the logger merges them.
    // However, legacy data might have 'note'.
    const fullContent = event.note ? `${event.summary}\n${event.note}` : event.summary;
    const isLongContent = fullContent.length > 80; // Character threshold for expansion
    const isClickable = isLongContent;

    return (
        <div className="flex gap-3 mb-6 last:mb-0 relative group">
            <div className="absolute left-[19px] top-10 bottom-[-24px] w-0.5 bg-slate-100 group-last:hidden" />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm ${event.type === 'System' || event.type === 'StageChange' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-500'
                }`}>
                <Icon size={16} />
            </div>
            <div className="flex-1">
                <div
                    className={`bg-white p-3 rounded-xl border border-slate-100 shadow-sm transition-all duration-200 ${isClickable ? 'cursor-pointer hover:border-blue-200 hover:shadow-md active:scale-[0.99]' : ''
                        }`}
                    onClick={() => {
                        if (isClickable) {
                            setIsExpanded(!isExpanded);
                        }
                    }}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-slate-700">{event.type}</span>
                        <span className="text-[10px] font-medium text-slate-400">{format(new Date(event.created_at), 'MMM d, h:mm a')}</span>
                    </div>

                    {/* Render content with truncation logic */}
                    <div className={`relative ${isClickable ? 'pr-2' : ''}`}>
                        <h4 className={`text-sm font-medium text-slate-900 mb-1 leading-relaxed whitespace-pre-line ${!isExpanded && isClickable ? 'line-clamp-2' : ''}`}>
                            {fullContent}
                        </h4>

                        {!isExpanded && isClickable && (
                            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
                        )}
                    </div>

                    {isClickable && (
                        <div className="mt-1 flex justify-end">
                            <span className="text-[10px] font-semibold text-blue-500 hover:underline">
                                {isExpanded ? 'Show less' : 'Read more'}
                            </span>
                        </div>
                    )}

                    {event.outcome_tag && (
                        <div className="mt-2">
                            <Badge variant="secondary" className="text-[10px] h-5 bg-slate-100 text-slate-600 border-slate-200">
                                {event.outcome_tag}
                            </Badge>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const SalesOpsPanel = ({ lead, events, onClose, onRefresh, onEdit, onViewContact, onMarkWon, userMap }: SalesOpsPanelProps) => {
    const [activityDialogOpen, setActivityDialogOpen] = useState(false);
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updatingLevel, setUpdatingLevel] = useState(false);

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === lead.status) return;
        setUpdatingStatus(true);
        try {
            const { error } = await supabase
                .from('leads')
                .update({ status: newStatus as any })
                .eq('id', lead.id);
            if (error) throw error;
            await logActivity(lead.id, 'StageChange', `Status changed from ${lead.status} to ${newStatus}`);
            toast.success(`Status updated to ${newStatus}`);
            onRefresh();
        } catch (error: any) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleFollowUpLevelChange = async (newLevel: string) => {
        if (newLevel === lead.follow_up_level) return;
        setUpdatingLevel(true);
        try {
            const { error } = await supabase
                .from('leads')
                .update({ follow_up_level: newLevel as Lead['follow_up_level'] })
                .eq('id', lead.id);
            if (error) throw error;
            toast.success(`Follow-up level updated to ${newLevel}`);
            onRefresh();
        } catch (error: any) {
            console.error('Error updating follow-up level:', error);
            toast.error('Failed to update level');
        } finally {
            setUpdatingLevel(false);
        }
    };

    const managerName = userMap[lead.owner_id || ''] || 'Unassigned';

    // Simple logic for overdue - if next follow up is in past and status is not closed
    const overdue = lead.next_follow_up &&
        new Date(lead.next_follow_up) < new Date() &&
        lead.status !== 'Won' &&
        lead.status !== 'Lost';

    // Heuristic for heat map label based on probability or status
    const getHeatmapLabel = () => {
        const prob = lead.probability || 0;
        if (lead.status === 'Won') return 'Closed Won';
        if (lead.status === 'Lost') return 'Closed Lost';
        if (prob >= 80) return 'Hot Lead 🔥';
        if (prob >= 50) return 'Warm Lead 🌤️';
        return 'Cold Lead ❄️';
    };
    const heatmapLabel = getHeatmapLabel();

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header Summary Card */}
            <div className="p-6 bg-white border-b border-slate-100">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {lead.lead_code ? `L-${String(lead.lead_code).padStart(4, '0')}` : 'NEW LEAD'}
                            </span>
                            {overdue && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                    OVERDUE
                                </Badge>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mt-1">{lead.title}</h2>

                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-slate-500 font-medium">{lead.contact?.company_name || 'No Company'}</p>
                            {lead.contact_id && (
                                <button
                                    onClick={() => onViewContact(lead.contact_id!)}
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-semibold bg-blue-50 px-2 py-0.5 rounded"
                                >
                                    View Contact <ArrowRight size={10} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(lead)}
                            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-500 hover:text-slate-900"
                            title="Edit Lead"
                        >
                            <Pencil size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors" aria-label="Close Panel">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Status */}
                    <div className="space-y-1">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Status</span>
                        <Select value={lead.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
                            <SelectTrigger className="h-8 w-full bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors">
                                {updatingStatus ? <Loader2 size={12} className="animate-spin" /> : <SelectValue />}
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Contacted">Contacted</SelectItem>
                                <SelectItem value="Qualified">Qualified</SelectItem>
                                <SelectItem value="Proposal">Proposal</SelectItem>
                                <SelectItem value="Negotiation">Negotiation</SelectItem>
                                <SelectItem value="Won">Won</SelectItem>
                                <SelectItem value="Lost">Lost</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Follow-up Level */}
                    <div className="space-y-1">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Follow-up Level</span>
                        <Select value={lead.follow_up_level || 'L0'} onValueChange={handleFollowUpLevelChange} disabled={updatingLevel}>
                            <SelectTrigger className="h-8 w-full bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100 hover:bg-purple-100 transition-colors">
                                {updatingLevel ? <Loader2 size={12} className="animate-spin" /> : <SelectValue />}
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="L0">L0</SelectItem>
                                <SelectItem value="L1">L1</SelectItem>
                                <SelectItem value="L2">L2</SelectItem>
                                <SelectItem value="L3">L3</SelectItem>
                                <SelectItem value="L4">L4</SelectItem>
                                <SelectItem value="L5">L5</SelectItem>
                                <SelectItem value="L6">L6</SelectItem>
                                <SelectItem value="L7">L7</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Manager */}
                    <div className="space-y-1">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Manager</span>
                        <div className="h-8 px-3 flex items-center bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                            {managerName}
                        </div>
                    </div>

                    {/* Heat Score */}
                    <div className="space-y-1">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Heat Score</span>
                        <div className="h-8 px-3 flex items-center bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-100">
                            {heatmapLabel}
                        </div>
                    </div>
                </div>

                {/* Social Links - Compact Row */}
                {(lead.website || lead.linkedin) && (
                    <div className="flex items-center gap-2 mb-4">
                        {lead.website && (
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors" title="Website">
                                <Globe size={14} />
                            </a>
                        )}
                        {lead.linkedin && (
                            <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors" title="LinkedIn">
                                <span className="text-[10px] font-bold">in</span>
                            </a>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                        <span className="text-xs text-slate-400 font-medium">Expected Value</span>
                        <div className="text-lg font-bold text-slate-800">
                            {getCurrencySymbol(lead.currency)}{lead.expected_value?.toLocaleString() || '0'}
                        </div>
                    </div>
                    <div
                        className="cursor-pointer group hover:bg-slate-100 p-2 -m-2 rounded-lg transition-colors"
                        onClick={() => setScheduleDialogOpen(true)}
                    >
                        <span className="text-xs text-slate-400 font-medium group-hover:text-blue-500 transition-colors">Next Follow-up</span>
                        <div className="text-sm font-bold text-slate-800 flex items-center gap-1 mt-1">
                            <Calendar size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                            {lead.next_follow_up ? format(new Date(lead.next_follow_up), 'MMM d, h:mm a') : 'Unscheduled'}
                        </div>
                        {lead.next_follow_up_agenda && (
                            <div className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                                {lead.next_follow_up_agenda}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => onMarkWon(lead)}
                        disabled={lead.status === 'Won'}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${lead.status === 'Won'
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                    >
                        <CheckCircle size={16} />
                        {lead.status === 'Won' ? 'Won' : 'Mark Won'}
                    </button>
                    <button
                        onClick={() => setActivityDialogOpen(true)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                    >
                        <Clock size={16} /> Log Activity
                    </button>
                </div>
            </div>

            {/* Timeline Section */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center">
                    Activity Timeline <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px]">{events.length}</span>
                </h3>
                <div className="flex flex-col">
                    {events.map((event) => (
                        <TimelineItem key={event.id} event={event} />
                    ))}
                    {events.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">No activity recorded yet.</div>
                    )}
                </div>
            </div>

            <ActivityLogDialog
                open={activityDialogOpen}
                onOpenChange={setActivityDialogOpen}
                leadId={lead.id}
                onSuccess={onRefresh}
            />
            <ScheduleFollowUpDialog
                open={scheduleDialogOpen}
                onOpenChange={setScheduleDialogOpen}
                leadId={lead.id}
                currentDate={lead.next_follow_up}
                currentAgenda={lead.next_follow_up_agenda}
                onSuccess={onRefresh}
            />
        </div>
    );
};


