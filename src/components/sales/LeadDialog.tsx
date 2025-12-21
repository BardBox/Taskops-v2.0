import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, DollarSign, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Lead } from "./LeadTable";

interface LeadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lead?: Lead | null;
    onSuccess: () => void;
}

const leadSchema = z.object({
    title: z.string().min(1, "Lead title is required"),
    value: z.coerce.number().min(0, "Value must be positive"),
    stage: z.enum(['New', 'Active', 'Won', 'Lost', 'On Hold']),
    probability: z.coerce.number().min(0).max(100),
    expected_close_date: z.date().optional().nullable(),
    owner_id: z.string().min(1, "Owner is required"),
    contact_id: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export function LeadDialog({ open, onOpenChange, lead, onSuccess }: LeadDialogProps) {
    const [contacts, setContacts] = useState<{ id: string; name: string; company_name: string | null }[]>([]);
    const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string }[]>([]);
    const [loading, setLoading] = useState(false);

    const form = useForm<LeadFormValues>({
        resolver: zodResolver(leadSchema),
        defaultValues: {
            title: "",
            value: 0,
            stage: "New",
            probability: 20,
            expected_close_date: undefined,
            owner_id: "",
            contact_id: "null", // String "null" for select handling
            notes: "",
        },
    });

    useEffect(() => {
        if (open) {
            fetchContacts();
            fetchTeamMembers();
            if (lead) {
                form.reset({
                    title: lead.title,
                    value: lead.value || 0,
                    stage: lead.stage,
                    probability: lead.probability || 0,
                    expected_close_date: lead.expected_close_date ? new Date(lead.expected_close_date) : undefined,
                    owner_id: lead.owner_id || "",
                    contact_id: lead.contact_id || "null",
                    notes: lead.notes || "",
                });
            } else {
                form.reset({
                    title: "",
                    value: 0,
                    stage: "New",
                    probability: 20,
                    expected_close_date: undefined,
                    owner_id: "", // Ideally current user
                    contact_id: "null",
                    notes: "",
                });
                // Set default assignee to current user
                supabase.auth.getUser().then(({ data }) => {
                    if (data.user) {
                        form.setValue("owner_id", data.user.id);
                    }
                });
            }
        }
    }, [open, lead, form]);

    const fetchContacts = async () => {
        const { data } = await supabase
            .from("contacts")
            .select("id, name, company_name")
            .order("name");
        if (data) setContacts(data);
    };

    const fetchTeamMembers = async () => {
        const { data } = await supabase
            .from("profiles")
            .select("id, full_name")
            .order("full_name");
        if (data) setTeamMembers(data);
    };

    const onSubmit = async (values: LeadFormValues) => {
        setLoading(true);
        try {
            const leadData = {
                title: values.title,
                value: values.value,
                stage: values.stage,
                probability: values.probability,
                expected_close_date: values.expected_close_date?.toISOString().split('T')[0], // Format as YYYY-MM-DD
                owner_id: values.owner_id,
                contact_id: values.contact_id === "null" ? null : values.contact_id,
                notes: values.notes,
            };

            if (lead) {
                const { error } = await supabase
                    .from("leads")
                    .update(leadData)
                    .eq("id", lead.id);
                if (error) throw error;
                toast.success("Lead updated successfully");
            } else {
                const { error } = await supabase
                    .from("leads")
                    .insert([leadData]);
                if (error) throw error;
                toast.success("Lead created successfully");
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error saving lead key details:", error);
            toast.error(error.message || "Failed to save lead");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{lead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
                    <DialogDescription>
                        {lead ? "Update the details of your sales lead." : "Enter the details for a new sales opportunity."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lead Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Website Redesign for Acme" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estimated Value</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" className="pl-8" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="probability"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Probability (%)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Percent className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" className="pl-8" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="stage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Stage</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select stage" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="New">New</SelectItem>
                                                <SelectItem value="Active">Active</SelectItem>
                                                <SelectItem value="Won">Won</SelectItem>
                                                <SelectItem value="Lost">Lost</SelectItem>
                                                <SelectItem value="On Hold">On Hold</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="expected_close_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Expected Close</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value || undefined}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="owner_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assigned To</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select team member" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {teamMembers.map((member) => (
                                                    <SelectItem key={member.id} value={member.id}>
                                                        {member.full_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="contact_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact / Company</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value ?? "null"}
                                            value={field.value ?? "null"}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select contact" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="null">-- None --</SelectItem>
                                                {contacts.map((contact) => (
                                                    <SelectItem key={contact.id} value={contact.id}>
                                                        {contact.name} {contact.company_name ? `(${contact.company_name})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Add any additional details here..."
                                            className="resize-none"
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Lead
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
