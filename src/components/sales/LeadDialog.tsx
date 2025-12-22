import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Globe, Linkedin, Facebook, Instagram, CalendarIcon, Upload, FileText, Link as LinkIcon, Plus, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Lead } from "./LeadTable";
import { logActivity } from "@/utils/activityLogger";
import { Contact } from "./ContactTable";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface LeadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lead?: Lead | null;
    onSuccess: () => void;
}

const formSchema = z.object({
    title: z.string().min(1, "Lead title is required"),
    contact_id: z.string().optional(),
    new_contact_name: z.string().optional(),
    new_contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
    new_contact_phone: z.string().optional(),
    owner_id: z.string().min(1, "Lead Producer is required"),
    lead_manager_id: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
    referral_name: z.string().optional().nullable(),
    status: z.enum(['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']),
    follow_up_level: z.enum(['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']).optional().nullable(),
    next_follow_up: z.date().optional().nullable(),
    expected_value: z.coerce.number().min(0, "Value must be positive").optional().nullable(),
    currency: z.string().optional().nullable(),
    probability: z.coerce.number().min(1).max(10), // 1-10 scale
    website: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    facebook: z.string().optional().nullable(),
    instagram: z.string().optional().nullable(),
    project_links: z.array(z.string()).max(3, "Max 3 links allowed").optional(),
    project_files: z.array(z.string()).max(3, "Max 3 files allowed").optional(),
    new_contact_designation: z.string().optional(),
    new_contact_company: z.string().optional(),
}).refine((data) => {
    if (data.contact_id === "new") {
        return !!data.new_contact_name && (!!data.new_contact_email || !!data.new_contact_phone);
    }
    return true;
}, {
    message: "Name and either Email or Phone are required for new contact",
    path: ["new_contact_name"],
});

type LeadFormValues = z.infer<typeof formSchema>;

export function LeadDialog({ open, onOpenChange, lead, onSuccess }: LeadDialogProps) {
    const [loading, setLoading] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [teamMembers, setTeamMembers] = useState<{ id: string, full_name: string }[]>([]);
    const [isNewContact, setIsNewContact] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | null>(null);

    const form = useForm<LeadFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            contact_id: "null",
            new_contact_name: "",
            new_contact_email: "",
            new_contact_phone: "",
            owner_id: "",
            lead_manager_id: null,
            source: "Direct",
            referral_name: null,
            status: "New",
            follow_up_level: "L0",
            next_follow_up: undefined,
            expected_value: 0,
            currency: "INR",
            probability: 5,
            website: null,
            linkedin: null,
            facebook: null,
            instagram: null,
            project_links: [],
            project_files: [],
            new_contact_designation: "",
            new_contact_company: "",
        },
    });

    useEffect(() => {
        if (open) {
            fetchContacts();
            fetchTeamMembers();
            getCurrentUser();
            if (lead) {
                const leadAny = lead as any; // Temporary cast
                form.reset({
                    title: lead.title,
                    contact_id: lead.contact_id || "null",
                    owner_id: lead.owner_id || "",
                    lead_manager_id: leadAny.lead_manager_id || null,
                    source: lead.source?.startsWith('Reference: ') ? 'Reference' : (lead.source || "Direct"),
                    referral_name: lead.source?.startsWith('Reference: ') ? lead.source.replace('Reference: ', '') : null,
                    status: lead.status || "New",
                    follow_up_level: (lead.follow_up_level as any) || "L0",
                    next_follow_up: lead.next_follow_up ? new Date(lead.next_follow_up) : undefined,
                    expected_value: lead.expected_value || 0,
                    currency: lead.currency || "INR",
                    probability: lead.probability ? Math.round(lead.probability / 10) : 5,
                    website: leadAny.website || null,
                    linkedin: leadAny.linkedin || null,
                    facebook: leadAny.facebook || null,
                    instagram: leadAny.instagram || null,
                    project_links: leadAny.project_links || [],
                    project_files: leadAny.project_files || [],
                    new_contact_designation: "",
                    new_contact_company: "",
                });
                setIsNewContact(false);
            } else {
                form.reset({
                    title: "",
                    contact_id: "null",
                    new_contact_name: "",
                    new_contact_email: "",
                    new_contact_phone: "",
                    owner_id: "",
                    lead_manager_id: null,
                    source: "Direct",
                    referral_name: null,
                    status: "New",
                    follow_up_level: "L0",
                    next_follow_up: undefined,
                    expected_value: 0,
                    currency: "INR",
                    probability: 5,
                    website: null,
                    linkedin: null,
                    facebook: null,
                    facebook: null,
                    instagram: null,
                    new_contact_company: "",
                });
                if (currentUser) {
                    form.setValue("owner_id", currentUser);
                }
                setIsNewContact(false);
            }
        }
    }, [open, lead, currentUser]);

    // Effect to update owner_id when currentUser is fetched (if creating new)
    useEffect(() => {
        if (open && !lead && currentUser) {
            form.setValue("owner_id", currentUser);
        }
    }, [currentUser, open, lead]);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user.id);
    };

    const fetchContacts = async () => {
        const { data } = await supabase.from('contacts').select('*').order('name');
        if (data) setContacts(data as Contact[]);
    };

    const fetchTeamMembers = async () => {
        try {
            // 1. Fetch valid user IDs from user_roles
            const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('user_id')
                .in('role', ['project_owner', 'business_head', 'sales_team'] as any);

            if (roleError) {
                console.error("Error fetching user roles:", roleError);
                return;
            }

            const userIds = roleData?.map(r => r.user_id) || [];
            if (userIds.length === 0) {
                console.log("No users found with required roles");
                setTeamMembers([]);
                return;
            }

            // 2. Fetch profiles for these IDs
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);

            if (profileError) {
                console.error("Error fetching profiles:", profileError);
                return;
            }

            // 3. Map to state
            if (profileData) {
                const members = profileData
                    .filter(p => p.full_name)
                    .map(p => ({
                        id: p.id,
                        full_name: p.full_name
                    }));
                setTeamMembers(members);
            }
        } catch (error) {
            console.error("Unexpected error fetching team members:", error);
            toast.error("Failed to load team members");
        }
    };

    const onSubmit = async (values: LeadFormValues, keepOpen: boolean = false) => {
        setLoading(true);
        try {
            let finalContactId = values.contact_id === "null" || values.contact_id === "new" ? null : values.contact_id;

            // 1. Handle New Contact Creation
            if (values.contact_id === "new") {
                const { data: newContact, error: contactError } = await supabase
                    .from('contacts')
                    .insert({
                        name: values.new_contact_name!,
                        company_name: values.new_contact_company || null,
                        email: values.new_contact_email || null,
                        phone: values.new_contact_phone || null,
                        designation: values.new_contact_designation || null,
                        website: values.website || null,
                        linkedin: values.linkedin || null,
                        facebook: values.facebook || null,
                        instagram: values.instagram || null,
                        created_by: currentUser
                    })
                    .select()
                    .single();

                if (contactError) throw contactError;
                if (newContact) finalContactId = newContact.id;
            }

            // 2. Prepare Lead Data
            const leadData: any = {
                title: values.title,
                contact_id: finalContactId,
                owner_id: values.owner_id,
                lead_manager_id: values.lead_manager_id || null,
                source: values.source === 'Reference' && values.referral_name
                    ? `Reference: ${values.referral_name}`
                    : values.source,
                status: values.status,
                follow_up_level: values.follow_up_level,
                next_follow_up: values.next_follow_up?.toISOString() || null,
                expected_value: values.expected_value || 0,
                currency: values.currency,
                probability: values.probability * 10,
                website: values.website || null,
                linkedin: values.linkedin || null,
                facebook: values.facebook || null,
                instagram: values.instagram || null,
                project_links: values.project_links || [],
                project_files: values.project_files || [],
            };

            // 3. Insert or Update
            if (lead) {
                if (lead.status !== values.status) {
                    await logActivity(lead.id, 'StageChange', `Status changed from ${lead.status} to ${values.status}`);
                }
                const { error } = await supabase
                    .from("leads")
                    .update(leadData)
                    .eq("id", lead.id);

                if (error) throw error;
                toast.success("Lead updated successfully");
            } else {
                const { data: newLead, error } = await supabase
                    .from("leads")
                    .insert([leadData])
                    .select()
                    .single();

                if (error) throw error;
                if (newLead) {
                    await logActivity(newLead.id, 'System', 'Lead Created');
                }
                toast.success("Lead created successfully");
            }

            onSuccess();
            if (keepOpen) {
                toast.success(lead ? "Lead updated!" : "Lead created! Ready for next one.");
                form.reset({
                    title: "",
                    contact_id: "null",
                    new_contact_name: "",
                    new_contact_email: "",
                    new_contact_phone: "",
                    owner_id: currentUser || "",
                    lead_manager_id: null,
                    source: "Direct",
                    referral_name: null,
                    status: "New",
                    follow_up_level: "L0",
                    next_follow_up: undefined,
                    expected_value: 0,
                    currency: "INR",
                    probability: 5,
                    website: null,
                    linkedin: null,
                    facebook: null,
                    instagram: null,
                    project_links: [],
                    project_files: [],
                    new_contact_designation: "",
                    new_contact_company: "",
                });
                setIsNewContact(false);
            } else {
                onOpenChange(false);
            }
        } catch (error: any) {
            console.error("Error saving lead:", error);
            toast.error(error.message || "Failed to save lead");
        } finally {
            setLoading(false);
        }
    };

    const getHeatmapLabel = (value: number) => {
        if (value <= 2) return "Freezing Cold 🥶";
        if (value <= 4) return "Cold ❄️";
        if (value <= 6) return "Warm 🌤️";
        if (value <= 8) return "Hot 🔥";
        return "Red Hot 💥";
    };

    const getHeatmapColor = (value: number) => {
        if (value <= 3) return "bg-blue-500";
        if (value <= 6) return "bg-yellow-500";
        return "bg-red-500";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{lead ? "Edit Lead" : "Create New Lead"}</DialogTitle>
                    <DialogDescription>
                        Fill in the details for the potential opportunity.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((values) => onSubmit(values, false))} className="space-y-6">
                        {/* Core Details */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 border-b pb-1 mb-3">Core Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Lead Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Enterprise License Deal - Acme Corp" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="owner_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Lead Producer</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Producer" />
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
                                    name="lead_manager_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Lead Manager</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || "null"}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Manager" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="null">-- None --</SelectItem>
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

                        {/* Contact Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 border-b pb-1 mb-3">Contact Information</h3>
                            <FormField
                                control={form.control}
                                name="contact_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select Contact</FormLabel>
                                        <Select
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                setIsNewContact(val === "new");
                                            }}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Search or add contact..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="null">-- Select Existing Contact --</SelectItem>
                                                <SelectItem value="new" className="font-bold text-blue-600 bg-blue-50">
                                                    + Create New Contact
                                                </SelectItem>
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

                            {isNewContact && (
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="new_contact_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Name *</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="John Doe" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="new_contact_email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="john@example.com" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="new_contact_phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="+123..." />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="new_contact_company"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Company Name</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="Acme Inc." />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="new_contact_designation"
                                            render={({ field }) => (
                                                <FormItem className="col-span-3">
                                                    <FormLabel>Designation / Title</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="e.g. CTO, Marketing Director" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="website"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Globe size={14} /> Website</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="https://..." className="h-8" value={field.value || ""} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="linkedin"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Linkedin size={14} /> LinkedIn</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Profile URL" className="h-8" value={field.value || ""} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="facebook"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Facebook size={14} /> Facebook</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Profile URL" className="h-8" value={field.value || ""} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="instagram"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Instagram size={14} /> Instagram</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Profile Handle/URL" className="h-8" value={field.value || ""} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Project Reference */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 border-b pb-1 mb-3">Project Reference</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Links Section */}
                                <div className="space-y-3">
                                    <FormLabel className="flex items-center gap-2 font-semibold">
                                        <LinkIcon size={14} /> Reference Links (Max 3)
                                    </FormLabel>
                                    <div className="space-y-2">
                                        {form.watch('project_links')?.map((link, index) => (
                                            <div key={index} className="flex gap-2">
                                                <Input value={link} readOnly className="bg-slate-50 h-8 text-sm" />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => {
                                                        const current = form.getValues('project_links') || [];
                                                        form.setValue('project_links', current.filter((_, i) => i !== index));
                                                    }}
                                                >
                                                    <X size={14} />
                                                </Button>
                                            </div>
                                        ))}
                                        {(form.watch('project_links')?.length || 0) < 3 && (
                                            <div className="flex gap-2">
                                                <Input
                                                    id="new-link-input"
                                                    placeholder="Add URL and press +"
                                                    className="h-8 text-sm"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const input = e.currentTarget as HTMLInputElement;
                                                            const val = input.value.trim();
                                                            if (val) {
                                                                const current = form.getValues('project_links') || [];
                                                                if (current.length < 3) {
                                                                    form.setValue('project_links', [...current, val]);
                                                                    input.value = '';
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => {
                                                        const input = document.getElementById('new-link-input') as HTMLInputElement;
                                                        const val = input.value.trim();
                                                        if (val) {
                                                            const current = form.getValues('project_links') || [];
                                                            if (current.length < 3) {
                                                                form.setValue('project_links', [...current, val]);
                                                                input.value = '';
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Plus size={14} />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Files Section */}
                                <div className="space-y-3">
                                    <FormLabel className="flex items-center gap-2 font-semibold">
                                        <FileText size={14} /> Reference Files (Max 3, &lt;10MB)
                                    </FormLabel>
                                    <div className="space-y-2">
                                        {form.watch('project_files')?.map((fileUrl, index) => (
                                            <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded border">
                                                <FileText size={14} className="text-blue-500" />
                                                <span className="text-xs truncate flex-1">{fileUrl.split('/').pop()}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => {
                                                        const current = form.getValues('project_files') || [];
                                                        form.setValue('project_files', current.filter((_, i) => i !== index));
                                                    }}
                                                >
                                                    <X size={12} />
                                                </Button>
                                            </div>
                                        ))}

                                        {(form.watch('project_files')?.length || 0) < 3 && (
                                            <div className="relative">
                                                <Input
                                                    type="file"
                                                    className="hidden"
                                                    id="file-upload"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        if (file.size > 10 * 1024 * 1024) {
                                                            toast.error("File size must be less than 10MB");
                                                            return;
                                                        }

                                                        const toastId = toast.loading("Uploading...", { duration: Infinity });
                                                        try {
                                                            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                                                            const { data, error } = await supabase.storage
                                                                .from('lead_attachments')
                                                                .upload(fileName, file);

                                                            if (error) throw error;

                                                            const { data: { publicUrl } } = supabase.storage
                                                                .from('lead_attachments')
                                                                .getPublicUrl(fileName);

                                                            const current = form.getValues('project_files') || [];
                                                            form.setValue('project_files', [...current, publicUrl]);
                                                            toast.success("File uploaded!");
                                                        } catch (error: any) {
                                                            console.error("Upload failed", error);
                                                            toast.error("Upload failed: " + error.message);
                                                        } finally {
                                                            toast.dismiss(toastId);
                                                            e.target.value = ''; // Reset input
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full h-8 text-sm gap-2"
                                                    onClick={() => document.getElementById('file-upload')?.click()}
                                                >
                                                    <Upload size={14} /> Upload File
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Deal Dynamics */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 border-b pb-1 mb-3">Deal Dynamics</h3>

                            <FormField
                                control={form.control}
                                name="probability"
                                render={({ field }) => (
                                    <FormItem className="bg-slate-50 p-4 rounded-xl border">
                                        <div className="flex justify-between items-center mb-4">
                                            <FormLabel className="text-base">Probability Heatmap</FormLabel>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getHeatmapColor(field.value)} transition-colors`}>
                                                {getHeatmapLabel(field.value)} ({field.value}/10)
                                            </span>
                                        </div>
                                        <FormControl>
                                            <Slider
                                                min={1}
                                                max={10}
                                                step={1}
                                                value={[field.value]}
                                                onValueChange={(vals) => field.onChange(vals[0])}
                                                className="py-4"
                                            />
                                        </FormControl>
                                        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            <span>Freezing</span>
                                            <span>Red Hot</span>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="expected_value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Expected Value</FormLabel>
                                            <div className="flex gap-2">
                                                <FormField
                                                    control={form.control}
                                                    name="currency"
                                                    render={({ field: currencyField }) => (
                                                        <Select onValueChange={currencyField.onChange} value={currencyField.value || "INR"}>
                                                            <FormControl>
                                                                <SelectTrigger className="w-[80px]">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="INR">INR</SelectItem>
                                                                <SelectItem value="USD">USD</SelectItem>
                                                                <SelectItem value="EUR">EUR</SelectItem>
                                                                <SelectItem value="GBP">GBP</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        onChange={e => field.onChange(parseFloat(e.target.value))}
                                                        value={field.value || ""}
                                                    />
                                                </FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="source"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Source</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value === 'Reference' ? 'Reference' : field.value || "Direct"}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Source" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Direct">Direct</SelectItem>
                                                    <SelectItem value="Website">Website</SelectItem>
                                                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                                    <SelectItem value="Reference">Reference</SelectItem>
                                                    <SelectItem value="Cold Call">Cold Call</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {field.value === 'Reference' && (
                                                <Input
                                                    placeholder="Referred By..."
                                                    className="mt-2"
                                                    onChange={(e) => {
                                                        form.setValue('referral_name', e.target.value);
                                                    }}
                                                    value={form.getValues('referral_name') || ""}
                                                />
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

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
                                                        <SelectValue placeholder="Status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="New">New</SelectItem>
                                                    <SelectItem value="Contacted">Contacted</SelectItem>
                                                    <SelectItem value="Qualified">Qualified</SelectItem>
                                                    <SelectItem value="Proposal">Proposal</SelectItem>
                                                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                                                    <SelectItem value="Won">Won</SelectItem>
                                                    <SelectItem value="Lost">Lost</SelectItem>
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
                                            <Select onValueChange={field.onChange} value={field.value || "L0"}>
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
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            {!lead && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-dashed"
                                    onClick={form.handleSubmit((values) => onSubmit(values, true))}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                    Add Next
                                </Button>
                            )}
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {lead ? "Save Changes" : "Create Lead"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
