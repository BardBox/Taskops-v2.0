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
import { Calendar, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export interface Lead {
    id: string;
    title: string;
    value: number | null;
    stage: 'New' | 'Active' | 'Won' | 'Lost' | 'On Hold';
    probability: number | null;
    expected_close_date: string | null;
    assigned_to: string | null;
    contact_id: string | null;
    contact?: {
        name: string;
        company_name: string | null;
    };
    notes?: string | null;
    created_at?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Immediate';
}

interface LeadTableProps {
    leads: Lead[];
    onEdit: (lead: Lead) => void;
    onDelete: (leadId: string) => void;
    onAddToCalendar: (lead: Lead) => void;
}

export const LeadTable = ({ leads, onEdit, onDelete, onAddToCalendar }: LeadTableProps) => {
    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'New': return 'bg-blue-100 text-blue-800';
            case 'Active': return 'bg-purple-100 text-purple-800';
            case 'Won': return 'bg-green-100 text-green-800';
            case 'Lost': return 'bg-red-100 text-red-800';
            case 'On Hold': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Lead Name</TableHead>
                        <TableHead>Contact (Company)</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Probability</TableHead>
                        <TableHead>Expected Close</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.map((lead) => (
                        <TableRow key={lead.id}>
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
                            <TableCell>${lead.value?.toLocaleString()}</TableCell>
                            <TableCell>
                                <Badge className={getStageColor(lead.stage)} variant="secondary">
                                    {lead.stage}
                                </Badge>
                            </TableCell>
                            <TableCell>{lead.probability}%</TableCell>
                            <TableCell>
                                {lead.expected_close_date
                                    ? format(new Date(lead.expected_close_date), 'MMM d, yyyy')
                                    : '-'}
                            </TableCell>
                            <TableCell>
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
                    ))}
                    {leads.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                No leads found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
