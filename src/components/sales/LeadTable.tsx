import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MoreVertical, Trash2, Edit, AlertCircle, User, Users } from "lucide-react";
import { useRef } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Removed Import/Export related imports
import { Download, Upload, Loader2, FileSpreadsheet } from "lucide-react";
// Removed excelHelpers import
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

export interface Lead {
    id: string;
    title: string;
    contact_id: string | null;
    owner_id: string | null;
    status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
    source: string | null;
    created_at: string;
    next_follow_up: string | null;
    next_follow_up_agenda?: string;
    follow_up_level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | null;
    expected_value: number | null;
    currency: string | null;
    probability: number | null; // Now 0-100 (from 1-10 scale * 10)
    lead_code: number;
    // New Fields (Extended interface for UI even if strict Supabase types differ initially)
    lead_manager_id?: string | null;
    priority?: string | null; // Deprecated but might exist in old data
    website?: string | null;
    linkedin?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    project_type?: string | null;
    project_links?: string[] | null;
    project_files?: string[] | null;

    // Joined fields
    contact?: {
        name: string;
        company_name?: string | null;
    } | null;
    // We might need to fetch producer/manager names if not joined in query
    // Ideally query updates to join profiles for owner and manager.
}

interface LeadTableProps {
    leads: Lead[];
    onEdit: (lead: Lead) => void;
    onDelete: (id: string) => void;
    onAddToCalendar: (lead: Lead) => void;
    onLeadClick: (lead: Lead) => void;
    userMap: Record<string, string>;
    getFollowUpStatus?: (lead: Lead) => 'overdue' | 'today' | 'upcoming' | 'future' | null;
    onSnooze?: (leadId: string) => void;
    onMarkCompleted?: (leadId: string) => void;
    onImportSuccess?: () => void; // Kept for interface compatibility but effectively unused here now, checking usages in parent
}

export const LeadTable = ({ leads, onEdit, onDelete, onAddToCalendar, onLeadClick, userMap, getFollowUpStatus, onSnooze, onMarkCompleted }: LeadTableProps) => {
    // Removed isImporting state and fileInputRef

    // Removed handleExportTemplate and handleImportLeads logic (lifted to parent)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Contacted': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'Qualified': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Proposal': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Negotiation': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Won': return 'bg-green-100 text-green-800 border-green-200';
            case 'Lost': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getCurrencySymbol = (currency: string | null) => {
        switch (currency) {
            case 'INR': return '₹';
            case 'EUR': return '€';
            case 'GBP': return '£';
            default: return '$';
        }
    };

    const isOverdue = (dateString: string | null, status: string) => {
        if (!dateString || status === 'Won' || status === 'Lost') return false;
        return isBefore(new Date(dateString), startOfDay(new Date()));
    };

    const getFollowUpBadge = (lead: Lead) => {
        if (!getFollowUpStatus) return null;
        const status = getFollowUpStatus(lead);
        if (!status) return null;

        const badgeConfig = {
            overdue: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '🔴 Overdue' },
            today: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: '🟠 Due Today' },
            upcoming: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: '🟡 Upcoming' },
            future: { bg: '', text: '', border: '', label: '' },
        };

        const config = badgeConfig[status];
        if (status === 'future') return null;

        return (
            <Badge
                variant="outline"
                className={cn(
                    'text-[10px] px-2 py-0.5 font-semibold',
                    config.bg,
                    config.text,
                    config.border
                )}
            >
                {config.label}
            </Badge>
        );
    };

    return (
        <div className="space-y-4">
            {/* Toolbar removed, logic lifted */}
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[80px]">Lead ID</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Producer</TableHead>
                            <TableHead>Manager</TableHead>
                            <TableHead>Value</TableHead>
                            {/* Removed Priority */}
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Level</TableHead>
                            <TableHead>Follow Up</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leads.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                                    No leads found. Add one to get started!
                                </TableCell>
                            </TableRow>
                        ) : (
                            leads.map((lead) => {
                                const overdue = isOverdue(lead.next_follow_up, lead.status);
                                return (
                                    <TableRow
                                        key={lead.id}
                                        className={cn(
                                            "cursor-pointer hover:bg-slate-50 transition-colors",
                                            overdue && "bg-red-50 hover:bg-red-100"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onLeadClick(lead);
                                        }}
                                    >
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            L-{String(lead.lead_code).padStart(4, '0')}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {lead.title}
                                            {lead.probability !== null && (
                                                <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                                    {/* Convert back to 1-10 for display? or % */}
                                                    <span className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        (lead.probability || 0) <= 30 ? "bg-blue-500" :
                                                            (lead.probability || 0) <= 60 ? "bg-yellow-500" : "bg-red-500"
                                                    )} />
                                                    {(lead.probability || 0) / 10}/10 Heat
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(lead.created_at), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-medium">{lead.contact?.name}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {lead.contact?.company_name || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <div className="flex items-center gap-1">
                                                <User size={12} className="text-slate-400" />
                                                {lead.owner_id ? (userMap[lead.owner_id] || 'Unknown') : '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {lead.lead_manager_id ? (
                                                <div className="flex items-center gap-1">
                                                    <Users size={12} className="text-slate-400" />
                                                    {userMap[lead.lead_manager_id] || 'Unknown'}
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {lead.expected_value ? (
                                                <span className="font-semibold text-slate-700">
                                                    {getCurrencySymbol(lead.currency)}
                                                    {lead.expected_value.toLocaleString()}
                                                </span>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn("font-normal border-0", getStatusColor(lead.status))}>
                                                {lead.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {lead.follow_up_level ? (
                                                <Badge variant="outline" className="text-sm px-3 py-1 bg-purple-50 border-purple-200 text-purple-700 font-bold">
                                                    {lead.follow_up_level}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell id={`lead-${lead.id}`}>
                                            <div className={cn("text-sm", overdue ? "text-red-600 font-bold" : "text-slate-600")}>
                                                <div className="flex items-center gap-2">
                                                    {lead.next_follow_up ? (
                                                        <span>{format(new Date(lead.next_follow_up), 'MMM d')}</span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                    {getFollowUpBadge(lead)}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => onEdit(lead)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onAddToCalendar(lead)}>
                                                        <Calendar className="mr-2 h-4 w-4" /> Add to Calendar
                                                    </DropdownMenuItem>
                                                    {lead.next_follow_up && onSnooze && (
                                                        <DropdownMenuItem onClick={() => onSnooze(lead.id)} className="text-blue-600 focus:text-blue-600">
                                                            <AlertCircle className="mr-2 h-4 w-4" /> Snooze +1 Day
                                                        </DropdownMenuItem>
                                                    )}
                                                    {lead.next_follow_up && onMarkCompleted && (
                                                        <DropdownMenuItem onClick={() => onMarkCompleted(lead.id)} className="text-green-600 focus:text-green-600">
                                                            <Calendar className="mr-2 h-4 w-4" /> Mark Completed
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete(lead.id)}
                                                        className="text-red-600 focus:text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div >
    );
};
