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
    contact_id: z.string().optional().nullable(),
    owner_id: z.string().min(1, "Owner is required"),
    source: z.string().optional().nullable(),
    status: z.enum(['New', 'Active', 'Won', 'Lost', 'On Hold']),
    follow_up_level: z.enum(['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']),
    next_follow_up: z.date().optional().nullable(),
    expected_value: z.coerce.number().min(0, "Value must be positive"),
    currency: z.string().default("INR"),
    probability: z.coerce.number().min(0).max(100),
    priority: z.enum(['Low', 'Medium', 'High', 'Immediate']),
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
            contact_id: "null",
            owner_id: "",
            source: "",
            status: "New",
            follow_up_level: "L0",
            next_follow_up: undefined,
            expected_value: 0,
            currency: "INR",
            probability: 20,
            priority: "Medium",
        },
    });

    useEffect(() => {
        if (open) {
            fetchContacts();
            fetchTeamMembers();
            if (lead) {
                form.reset({
                    title: lead.title,
                    contact_id: lead.contact_id || "null",
                    owner_id: lead.owner_id || "",
                    source: lead.source || "",
                    status: lead.status || "New",
                    follow_up_level: (lead.follow_up_level as "L0" | "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7") || "L0",
                    next_follow_up: lead.next_follow_up ? new Date(lead.next_follow_up) : undefined,
                    expected_value: lead.expected_value || 0,
                    currency: lead.currency || "USD",
                    probability: lead.probability || 0,
                    priority: lead.priority || "Medium",
                });
            } else {
                form.reset({
                    title: "",
                    contact_id: "null",
                    owner_id: "",
                    source: "",
                    status: "New",
                    follow_up_level: "L0",
                    next_follow_up: undefined,
                    expected_value: 0,
                    currency: "INR",
                    probability: 20,
                    priority: "Medium",
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
                contact_id: values.contact_id === "null" ? null : values.contact_id,
                owner_id: values.owner_id,
                source: values.source,
                status: values.status,
                follow_up_level: values.follow_up_level,
                next_follow_up: values.next_follow_up?.toISOString(),
                expected_value: values.expected_value,
                currency: values.currency,
                probability: values.probability,
                priority: values.priority,
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
            console.error("Error saving lead:", error);
            toast.error(error.message || "Failed to save lead");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{lead ? "Edit Lead" : "Create New Lead"}</DialogTitle>
                    <DialogDescription>
                        Frictionless entry for your sales opportunities.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* REQUIRED FIELDS FIRST */}
                        <div className="space-y-4 border-b pb-4">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Required Details</h4>
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lead Title <span className="text-red-500">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Acme Corp Contract" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="contact_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contact <span className="text-red-500">*</span></FormLabel>
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
                                <FormField
                                    control={form.control}
                                    name="owner_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Owner (Assignee) <span className="text-red-500">*</span></FormLabel>
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
                            </div>
                        </div>

                        {/* OPTIONAL FIELDS */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Additional Details</h4>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status" />
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
                                    name="follow_up_level"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Follow-up Level</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select level" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="L0">L0 - Captured</SelectItem>
                                                    <SelectItem value="L1">L1 - Attempted</SelectItem>
                                                    <SelectItem value="L2">L2 - Connected</SelectItem>
                                                    <SelectItem value="L3">L3 - Discovery</SelectItem>
                                                    <SelectItem value="L4">L4 - Meeting</SelectItem>
                                                    <SelectItem value="L5">L5 - Proposal</SelectItem>
                                                    <SelectItem value="L6">L6 - Negotiation</SelectItem>
                                                    <SelectItem value="L7">L7 - Closed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="source"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Source</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. LinkedIn, Referral" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="priority"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Priority</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select priority" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Low">Low</SelectItem>
                                                    <SelectItem value="Medium">Medium</SelectItem>
                                                    <SelectItem value="High">High</SelectItem>
                                                    <SelectItem value="Immediate">Immediate</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="next_follow_up"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col mt-2">
                                            <FormLabel>Next Follow Up</FormLabel>
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
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <FormField
                                            control={form.control}
                                            name="currency"
                                            render={({ field }) => (
                                                <FormItem className="w-24">
                                                    <FormLabel>Currency</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Curr" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="USD">USD ($)</SelectItem>
                                                            <SelectItem value="INR">INR (₹)</SelectItem>
                                                            <SelectItem value="EUR">EUR (€)</SelectItem>
                                                            <SelectItem value="GBP">GBP (£)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="expected_value"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>Est. Value</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
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
                            </div>
                        </div>

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
