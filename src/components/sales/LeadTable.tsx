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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}

export const LeadTable = ({ leads, onEdit, onDelete, onAddToCalendar, onLeadClick, userMap }: LeadTableProps) => {

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

    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-[80px]">Lead ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Producer</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableHead>Value</TableHead>
                        {/* Removed Priority */}
                        <TableHead>Status</TableHead>
                        <TableHead>Follow Up</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
                                    onClick={() => onLeadClick(lead)}
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
                                        <div className="flex flex-col">
                                            <span className="text-sm">{lead.contact?.name}</span>
                                            {lead.contact?.company_name && (
                                                <span className="text-xs text-muted-foreground">{lead.contact.company_name}</span>
                                            )}
                                        </div>
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
                                    <TableCell>
                                        <div className={cn("text-sm flex flex-col", overdue ? "text-red-600 font-bold" : "text-slate-600")}>
                                            {lead.next_follow_up ? format(new Date(lead.next_follow_up), 'MMM d') : '-'}
                                            {lead.follow_up_level && (
                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                                    {lead.follow_up_level}
                                                </span>
                                            )}
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
        </div >
    );
};
