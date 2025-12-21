import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export interface Contact {
    id: string;
    contact_code: number;
    name: string;
    email: string | null;
    phone: string | null;
    designation: string | null;
    company_name: string | null;
    tags: string[] | null;
    created_at: string;
}

interface ContactTableProps {
    contacts: Contact[];
    onEdit: (contact: Contact) => void;
    onDelete: (contactId: string) => void;
}

export const ContactTable = ({ contacts, onEdit, onDelete }: ContactTableProps) => {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                            <TableCell className="font-medium">{contact.name}</TableCell>
                            <TableCell>{contact.company_name || '-'}</TableCell>
                            <TableCell>{contact.designation || '-'}</TableCell>
                            <TableCell>{contact.email || '-'}</TableCell>
                            <TableCell>{contact.phone || '-'}</TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {contact.tags && contact.tags.length > 0 ? (
                                        contact.tags.map((tag, index) => (
                                            <Badge key={index} variant="outline" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))
                                    ) : (
                                        '-'
                                    )}
                                </div>
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
                                        <DropdownMenuItem onClick={() => onEdit(contact)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600"
                                            onClick={() => onDelete(contact.id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                    {contacts.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                No contacts found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
