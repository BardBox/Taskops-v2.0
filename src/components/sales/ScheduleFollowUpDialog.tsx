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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleFollowUpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: string;
    currentDate?: string | null;
    currentAgenda?: string | null;
    onSuccess: () => void;
}

const scheduleSchema = z.object({
    nextFollowUp: z.date({
        required_error: "Please select a date and time",
    }),
    agenda: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

export function ScheduleFollowUpDialog({ open, onOpenChange, leadId, currentDate, currentAgenda, onSuccess }: ScheduleFollowUpDialogProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<ScheduleFormValues>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: {
            nextFollowUp: currentDate ? new Date(currentDate) : undefined,
            agenda: currentAgenda || "",
        },
    });

    const onSubmit = async (values: ScheduleFormValues) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('leads')
                .update({
                    next_follow_up: values.nextFollowUp.toISOString(),
                    next_follow_up_agenda: values.agenda
                })
                .eq('id', leadId);

            if (error) throw error;

            toast.success("Follow-up scheduled!");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error scheduling follow-up:", error);
            toast.error("Failed to schedule follow-up");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Schedule Next Follow Up</DialogTitle>
                    <DialogDescription>
                        Set a date and agenda for the next interaction.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="nextFollowUp"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date & Time</FormLabel>
                                    <FormControl>
                                        <input
                                            type="datetime-local"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                            value={field.value instanceof Date ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="agenda"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Agenda</FormLabel>
                                    <FormControl>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="What's the plan?"
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Schedule
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
