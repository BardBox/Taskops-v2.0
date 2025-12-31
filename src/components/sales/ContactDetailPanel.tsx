import React, { useState, useEffect } from 'react';
import {
    X, Phone, Mail, Globe, Facebook, Linkedin, Instagram,
    Share2, Pencil, Briefcase, Building2, Tag, Copy, FolderOpen
} from 'lucide-react';
import { Contact } from './ContactTable';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from './LeadTable';

interface ContactDetailPanelProps {
    contact: Contact;
    onClose: () => void;
    onEdit: (contact: Contact) => void;
}

export const ContactDetailPanel = ({ contact, onClose, onEdit }: ContactDetailPanelProps) => {
    const [pastLeads, setPastLeads] = useState<Lead[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);

    useEffect(() => {
        const fetchPastLeads = async () => {
            setLoadingLeads(true);
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('contact_id', contact.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setPastLeads(data as unknown as Lead[] || []);
            } catch (error) {
                console.error("Error fetching past leads:", error);
                // Don't toast here to avoid clutter
            } finally {
                setLoadingLeads(false);
            }
        };

        if (contact.id) {
            fetchPastLeads();
        }
    }, [contact.id]);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const handleShare = () => {
        const shareText = `
${contact.name}
${contact.designation || ''} at ${contact.company_name || ''}

Email: ${contact.email || '-'}
Phone: ${contact.phone || '-'}
Website: ${contact.website || '-'}
linkedin: ${contact.linkedin || '-'}
        `.trim();

        navigator.clipboard.writeText(shareText);
        toast.success("Contact details copied to clipboard!");
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-800';
            case 'Contacted': return 'bg-indigo-100 text-indigo-800';
            case 'Qualified': return 'bg-purple-100 text-purple-800';
            case 'Proposal': return 'bg-yellow-100 text-yellow-800';
            case 'Negotiation': return 'bg-orange-100 text-orange-800';
            case 'Won': return 'bg-green-100 text-green-800';
            case 'Lost': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-slate-50 shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header Section */}
            <div className="p-6 bg-white border-b border-slate-100">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                CONTACT #{contact.contact_code}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mt-1">{contact.name}</h2>
                        {contact.designation && (
                            <p className="text-sm font-medium text-slate-600 flex items-center gap-1.5 mt-1">
                                <Briefcase size={14} className="text-slate-400" />
                                {contact.designation}
                            </p>
                        )}
                        {contact.company_name && (
                            <p className="text-sm font-medium text-slate-600 flex items-center gap-1.5 mt-1">
                                <Building2 size={14} className="text-slate-400" />
                                {contact.company_name}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(contact)}
                            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-500 hover:text-slate-900"
                            title="Edit Contact"
                        >
                            <Pencil size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 mt-4">
                    <button
                        onClick={handleShare}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Share2 size={16} /> Share Contact
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-6">

                {/* Contact Information */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Details</h3>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                <Mail size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-400 font-medium mb-0.5">Email Address</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {contact.email || <span className="text-slate-300 italic">Not provided</span>}
                                    </p>
                                    {contact.email && (
                                        <button onClick={() => handleCopy(contact.email!, 'Email')} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded text-slate-400 transition-all">
                                            <Copy size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-green-50 group-hover:text-green-500 transition-colors">
                                <Phone size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-400 font-medium mb-0.5">Phone Number</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {contact.phone || <span className="text-slate-300 italic">Not provided</span>}
                                    </p>
                                    {contact.phone && (
                                        <button onClick={() => handleCopy(contact.phone!, 'Phone')} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded text-slate-400 transition-all">
                                            <Copy size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Past Leads / History */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                        <FolderOpen size={16} className="text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">History ({pastLeads.length})</h3>
                    </div>

                    <div className="space-y-3">
                        {loadingLeads ? (
                            <div className="text-center py-4 text-sm text-slate-400">Loading history...</div>
                        ) : pastLeads.length === 0 ? (
                            <div className="text-center py-4 text-sm text-slate-400 italic">No past leads found.</div>
                        ) : (
                            pastLeads.map((lead) => (
                                <div key={lead.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">{lead.title}</h4>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${getStatusColor(lead.status)}`}>
                                            {lead.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                        <span>{format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
                                        <span className="font-semibold text-slate-700">
                                            {lead.expected_value ? lead.expected_value.toLocaleString() : '-'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Social Media */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Digital Presence</h3>

                    <div className="grid grid-cols-2 gap-3">
                        {contact.website && (
                            <a
                                href={contact.website} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all group"
                            >
                                <div className="p-2 bg-white rounded-lg text-slate-400 group-hover:text-blue-500 shadow-sm">
                                    <Globe size={18} />
                                </div>
                                <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900">Website</span>
                            </a>
                        )}

                        {contact.linkedin && (
                            <a
                                href={contact.linkedin} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all group"
                            >
                                <div className="p-2 bg-white rounded-lg text-slate-400 group-hover:text-[#0077b5] shadow-sm">
                                    <Linkedin size={18} />
                                </div>
                                <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900">LinkedIn</span>
                            </a>
                        )}

                        {contact.facebook && (
                            <a
                                href={contact.facebook} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all group"
                            >
                                <div className="p-2 bg-white rounded-lg text-slate-400 group-hover:text-[#1877F2] shadow-sm">
                                    <Facebook size={18} />
                                </div>
                                <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900">Facebook</span>
                            </a>
                        )}

                        {contact.instagram && (
                            <a
                                href={contact.instagram} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all group"
                            >
                                <div className="p-2 bg-white rounded-lg text-slate-400 group-hover:text-[#E4405F] shadow-sm">
                                    <Instagram size={18} />
                                </div>
                                <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900">Instagram</span>
                            </a>
                        )}

                        {/* Fallback for no socials */}
                        {!contact.website && !contact.linkedin && !contact.facebook && !contact.instagram && (
                            <div className="col-span-2 text-center py-4 text-slate-400 text-sm italic">
                                No social media profiles added.
                            </div>
                        )}
                    </div>
                </div>

                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Tag size={16} className="text-slate-400" />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tags</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {contact.tags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-center text-xs text-slate-300 pt-4">
                    Added on {format(new Date(contact.created_at), 'PPP')}
                </div>

            </div>
        </div>
    );
};
