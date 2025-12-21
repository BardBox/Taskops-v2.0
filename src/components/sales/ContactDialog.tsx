import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
    tags: z.string().optional().nullable(), // Comma separated string for input
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
                });
            } else {
                form.reset({
                    name: "",
                    company_name: "",
                    designation: "",
                    email: "",
                    phone: "",
                    tags: "",
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
