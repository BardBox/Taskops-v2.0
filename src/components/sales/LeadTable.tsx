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
import { Calendar, MoreHorizontal, Pencil, Trash2, AlertCircle } from "lucide-react";
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
    lead_code?: number;
    title: string;
    expected_value: number | null;
    currency?: string | null;
    status: 'New' | 'Active' | 'Won' | 'Lost' | 'On Hold';
    probability: number | null;
    next_follow_up: string | null;
    owner_id: string | null;
    contact_id: string | null;
    follow_up_level?: string | null;
    source?: string | null;
    contact?: {
        name: string;
        company_name: string | null;
    };
    created_at?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Immediate';
}

interface LeadTableProps {
    leads: Lead[];
    onEdit: (lead: Lead) => void;
    onDelete: (leadId: string) => void;
    onAddToCalendar: (lead: Lead) => void;
    onLeadClick: (lead: Lead) => void;
}

export const LeadTable = ({ leads, onEdit, onDelete, onAddToCalendar, onLeadClick }: LeadTableProps) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-800';
            case 'Active': return 'bg-purple-100 text-purple-800';
            case 'Won': return 'bg-green-100 text-green-800';
            case 'Lost': return 'bg-red-100 text-red-800';
            case 'On Hold': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'Immediate': return 'bg-red-100 text-red-800 border-red-200';
            case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Low': return 'bg-slate-100 text-slate-800 border-slate-200';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getCurrencySymbol = (currency?: string | null) => {
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
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Lead Name</TableHead>
                        <TableHead>Contact (Company)</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Next Follow Up</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.map((lead) => {
                        const overdue = isOverdue(lead.next_follow_up, lead.status);
                        return (
                            <TableRow
                                key={lead.id}
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => onLeadClick(lead)}
                            >
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                    L-{String(lead.lead_code || 0).padStart(4, '0')}
                                </TableCell>
                                <TableCell className="font-medium">{lead.title}</TableCell>
                                <TableCell>
                                    {lead.contact ? (
                                        <div className="flex flex-col">
                                            <span className="font-medium">{lead.contact.name}</span>
                                            {lead.contact.company_name && (
                                                <span className="text-xs text-muted-foreground">{lead.contact.company_name}</span>
                                            )}
                                        </div>
                                    ) : '-'}
                                </TableCell>
                                <TableCell>
                                    {getCurrencySymbol(lead.currency)}
                                    {lead.expected_value?.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    <Badge className={getStatusColor(lead.status)} variant="secondary">
                                        {lead.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className={getPriorityColor(lead.priority)} variant="outline">
                                        {lead.priority || 'Medium'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {lead.next_follow_up ? (
                                        <div className={cn("flex items-center gap-2", overdue && "text-red-600 font-medium")}>
                                            {overdue && <AlertCircle className="h-4 w-4" />}
                                            {format(new Date(lead.next_follow_up), 'MMM d, yyyy')}
                                        </div>
                                    ) : '-'}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEdit(lead)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onAddToCalendar(lead)}>
                                                <Calendar className="mr-2 h-4 w-4" />
                                                Add to Calendar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-red-600 focus:text-red-600"
                                                onClick={() => onDelete(lead.id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {leads.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                                No leads found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
