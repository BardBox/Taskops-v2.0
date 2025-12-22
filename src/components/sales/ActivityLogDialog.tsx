import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logActivity, ActivityType } from "@/utils/activityLogger";

interface ActivityLogDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: string;
    onSuccess: () => void;
}

const activitySchema = z.object({
    type: z.enum(['Call', 'WhatsApp', 'Email', 'Meeting', 'Note', 'Proposal'] as const),
    summary: z.string().min(1, "Summary is required"),
    note: z.string().optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

export function ActivityLogDialog({ open, onOpenChange, leadId, onSuccess }: ActivityLogDialogProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<ActivityFormValues>({
        resolver: zodResolver(activitySchema),
        defaultValues: {
            type: "Call",
            summary: "",
            note: "",
        },
    });

    const onSubmit = async (values: ActivityFormValues) => {
        setLoading(true);
        try {
            // Append note to summary as per current schema limitation/workaround
            // Or if we fix schema later, pass separately. 
            // The utility handles the appending now.

            const success = await logActivity(
                leadId,
                values.type as ActivityType,
                values.summary,
                values.note
            );

            if (success) {
                toast.success("Activity logged successfully");
                form.reset();
                onSuccess();
                onOpenChange(false);
            }
        } catch (error) {
            console.error("Error logging activity:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Log Activity</DialogTitle>
                    <DialogDescription>
                        Record a new interaction or update for this lead.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Activity Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Call">Call</SelectItem>
                                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                                            <SelectItem value="Email">Email</SelectItem>
                                            <SelectItem value="Meeting">Meeting</SelectItem>
                                            <SelectItem value="Note">Note</SelectItem>
                                            <SelectItem value="Proposal">Proposal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="summary"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Summary</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="What happened? (e.g. Discussed pricing)"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Additional Note (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Any other details..."
                                            className="resize-none h-20"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Log Activity
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
