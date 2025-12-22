import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Globe, Linkedin, Facebook, Instagram } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Contact } from "./ContactTable";

interface ContactDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contact?: Contact | null;
    onSuccess: () => void;
}

const contactSchema = z.object({
    name: z.string().min(1, "Name is required"),
    company_name: z.string().optional().nullable(),
    designation: z.string().optional().nullable(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().optional().nullable(),
    tags: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    facebook: z.string().optional().nullable(),
    instagram: z.string().optional().nullable(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactDialog({ open, onOpenChange, contact, onSuccess }: ContactDialogProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            name: "",
            company_name: "",
            designation: "",
            email: "",
            phone: "",
            tags: "",
            website: "",
            linkedin: "",
            facebook: "",
            instagram: "",
        },
    });

    useEffect(() => {
        if (open) {
            if (contact) {
                form.reset({
                    name: contact.name,
                    company_name: contact.company_name || "",
                    designation: contact.designation || "",
                    email: contact.email || "",
                    phone: contact.phone || "",
                    tags: contact.tags ? contact.tags.join(", ") : "",
                    website: contact.website || "",
                    linkedin: contact.linkedin || "",
                    facebook: contact.facebook || "",
                    instagram: contact.instagram || "",
                });
            } else {
                form.reset({
                    name: "",
                    company_name: "",
                    designation: "",
                    email: "",
                    phone: "",
                    tags: "",
                    website: "",
                    linkedin: "",
                    facebook: "",
                    instagram: "",
                });
            }
        }
    }, [open, contact, form]);

    const onSubmit = async (values: ContactFormValues) => {
        setLoading(true);
        try {
            const tagsArray = values.tags
                ? values.tags.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0)
                : [];

            const contactData = {
                name: values.name,
                company_name: values.company_name || null,
                designation: values.designation || null,
                email: values.email || null,
                phone: values.phone || null,
                tags: tagsArray.length > 0 ? tagsArray : null,
                website: values.website || null,
                linkedin: values.linkedin || null,
                facebook: values.facebook || null,
                instagram: values.instagram || null,
            };

            if (contact) {
                const { error } = await supabase
                    .from("contacts")
                    .update(contactData)
                    .eq("id", contact.id);
                if (error) throw error;
                toast.success("Contact updated successfully");
            } else {
                const { error } = await supabase
                    .from("contacts")
                    .insert([contactData]);
                if (error) throw error;
                toast.success("Contact created successfully");
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error saving contact:", error);
            toast.error(error.message || "Failed to save contact");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{contact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
                    <DialogDescription>
                        {contact ? "Update contact details." : "Add a new contact to your address book."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="company_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Acme Corp" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="designation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title / Designation</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. CEO" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tags</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. VIP, Client (comma separated)" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="john@example.com" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+1 234 567 890" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
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
                                            <Input {...field} placeholder="Profile URL" className="h-8" value={field.value || ""} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Contact
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
