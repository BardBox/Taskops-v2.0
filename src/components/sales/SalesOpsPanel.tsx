import React, { useState } from 'react';
import {
    Phone, MessageSquare, Mail, Calendar,
    FileText, ArrowRight, Settings, CheckCircle,
    Clock, AlertCircle, X, Loader2, Pencil, Globe
} from 'lucide-react';
import { Lead } from './LeadTable';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { ActivityLogDialog } from './ActivityLogDialog';

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
    userMap: Record<string, string>;
}

// ... (omitted code)

export const SalesOpsPanel = ({ lead, events, onClose, onRefresh, onEdit, onViewContact, userMap }: SalesOpsPanelProps) => {
    // ... (omitted code)

    return (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-slate-50 shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
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
                        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100">{lead.status}</span>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100">
                        Mgr: {managerName}
                    </span>
                    {lead.follow_up_level && (
                        <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold border border-purple-100">
                            {lead.follow_up_level}
                        </span>
                    )}
                    <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-100">
                        {heatmapLabel}
                    </span>
                </div>

                {/* Social Media & Website */}
                <div className="flex items-center gap-3 mb-6">
                    {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                            <span className="sr-only">Website</span>
                            <Globe size={16} />
                        </a>
                    )}
                    {lead.linkedin && (
                        <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 rounded-full text-blue-600 hover:bg-blue-100 transition-colors">
                            <span className="sr-only">LinkedIn</span>
                            <span className="text-xs font-bold px-1">in</span>
                        </a>
                    )}
                    {/* Placeholder for generic socials if icons not available */}
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
        </div>
    );
};


