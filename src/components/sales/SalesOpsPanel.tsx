import React from 'react';
import {
    Phone, MessageSquare, Mail, Calendar,
    FileText, ArrowRight, Settings, CheckCircle,
    Clock, AlertCircle, MoreVertical, X
} from 'lucide-react';
import { Lead } from './LeadTable';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

export interface Activity {
    id: string;
    type: 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Note' | 'Proposal' | 'System' | 'StageChange';
    summary: string;
    outcome_tag?: string; // e.g. "No Answer", "Interested"
    created_at: string;
    note?: string; // derived from `summary` if unstructured, or separate field
    // Mock fields for UI logic not in schema yet:
    status?: 'Overdue' | 'Done';
    overdueDays?: number;
}

interface SalesOpsPanelProps {
    lead: Lead;
    events: Activity[];
    onClose: () => void;
}

const EventIcon = ({ type }: { type: Activity['type'] }) => {
    const iconMap: Record<string, React.ReactNode> = {
        Call: <Phone size={16} className="text-blue-500" />,
        WhatsApp: <MessageSquare size={16} className="text-green-500" />,
        Email: <Mail size={16} className="text-purple-500" />,
        Meeting: <Calendar size={16} className="text-orange-500" />,
        Note: <FileText size={16} className="text-gray-500" />,
        Proposal: <FileText size={16} className="text-indigo-500" />,
        StageChange: <ArrowRight size={16} className="text-pink-500" />,
        System: <Settings size={16} className="text-slate-400" />,
    };
    return iconMap[type] || <CheckCircle size={16} />;
};

const TimelineItem = ({ event }: { event: Activity }) => {
    const isOverdue = event.status === 'Overdue';
    const timestamp = format(new Date(event.created_at), 'MMM d, h:mm a');

    return (
        <div className="relative pl-8 pb-8 last:pb-0">
            {/* Vertical Line Connector */}
            <div className="absolute left-[11px] top-2 h-full w-[2px] bg-slate-100 last:hidden" />

            {/* Icon Node */}
            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center z-10 
        ${isOverdue ? 'border-red-400 shadow-sm shadow-red-100' : 'border-slate-100'}`}>
                <EventIcon type={event.type} />
            </div>

            <div className={`p-4 rounded-2xl border transition-all duration-200 hover:shadow-md 
        ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{timestamp}</span>
                    {event.outcome_tag && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {event.outcome_tag}
                        </span>
                    )}
                </div>
                <h4 className="text-sm font-bold text-slate-800">{event.summary}</h4>
                {event.note && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{event.note}</p>}

                {isOverdue && (
                    <div className="mt-3 flex items-center text-xs font-bold text-red-600">
                        <AlertCircle size={14} className="mr-1" /> Overdue by {event.overdueDays} days
                    </div>
                )}
            </div>
        </div>
    );
};

export const SalesOpsPanel = ({ lead, events, onClose }: SalesOpsPanelProps) => {
    const getCurrencySymbol = (currency?: string | null) => {
        switch (currency) {
            case 'INR': return '₹';
            case 'EUR': return '€';
            case 'GBP': return '£';
            default: return '$';
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-slate-50 shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header Summary Card */}
            <div className="p-6 bg-white border-b border-slate-100">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {lead.lead_code ? `L-${String(lead.lead_code).padStart(4, '0')}` : 'NEW LEAD'}
                        </span>
                        <h2 className="text-xl font-bold text-slate-900 mt-1">{lead.title}</h2>
                        <p className="text-sm text-slate-500 font-medium">{lead.contact?.company_name || 'No Company'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100">{lead.status}</span>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100">{lead.contact?.name}</span>
                    {lead.follow_up_level && (
                        <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold border border-purple-100">
                            {lead.follow_up_level}
                        </span>
                    )}
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${lead.priority === 'High' || lead.priority === 'Immediate' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                        {lead.priority || 'Medium'} Priority
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                        <span className="text-xs text-slate-400 font-medium">Expected Value</span>
                        <div className="text-lg font-bold text-slate-800">
                            {getCurrencySymbol(lead.currency)}{lead.expected_value?.toLocaleString() || '0'}
                        </div>
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 font-medium">Next Follow-up</span>
                        <div className="text-sm font-bold text-slate-800 flex items-center gap-1 mt-1">
                            <Calendar size={14} className="text-slate-400" />
                            {lead.next_follow_up ? format(new Date(lead.next_follow_up), 'MMM d, h:mm a') : 'Unscheduled'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
                        <CheckCircle size={16} /> Mark Won
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
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
        </div>
    );
};
