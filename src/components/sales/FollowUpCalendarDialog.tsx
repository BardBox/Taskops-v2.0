import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Lead } from './LeadTable';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfDay } from 'date-fns';
import { CalendarClock, ChevronLeft, ChevronRight, User, Building2, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FollowUpCalendarDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
    onMarkCompleted: (leadId: string) => void;
}

export function FollowUpCalendarDialog({
    open,
    onOpenChange,
    leads,
    onLeadClick,
    onMarkCompleted
}: FollowUpCalendarDialogProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewMonth, setViewMonth] = useState<Date>(new Date());

    // Group leads by date
    const leadsByDate = useMemo(() => {
        const grouped: Record<string, Lead[]> = {};
        leads.forEach(lead => {
            if (lead.next_follow_up) {
                const dateKey = format(new Date(lead.next_follow_up), 'yyyy-MM-dd');
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(lead);
            }
        });
        return grouped;
    }, [leads]);

    // Get leads for selected date
    const selectedDateLeads = useMemo(() => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return leadsByDate[dateKey] || [];
    }, [selectedDate, leadsByDate]);

    // Get dates that have follow-ups for calendar highlighting
    const datesWithFollowUps = useMemo(() => {
        return Object.keys(leadsByDate).map(dateStr => new Date(dateStr));
    }, [leadsByDate]);

    // Custom day content for calendar
    const getDayStatus = (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayLeads = leadsByDate[dateKey] || [];
        if (dayLeads.length === 0) return null;

        const now = startOfDay(new Date());
        if (isBefore(date, now) && !isToday(date)) {
            return 'overdue';
        }
        if (isToday(date)) {
            return 'today';
        }
        return 'upcoming';
    };

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'overdue': return 'bg-red-500';
            case 'today': return 'bg-blue-500';
            case 'upcoming': return 'bg-green-500';
            default: return '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[85vh] p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <CalendarClock size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-800">Follow-up Calendar</DialogTitle>
                            <p className="text-sm text-slate-500 mt-0.5">
                                All scheduled follow-ups across your leads
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-col md:flex-row h-[calc(85vh-100px)]">
                    {/* Calendar Section */}
                    <div className="p-4 border-b md:border-b-0 md:border-r md:w-[340px] shrink-0">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            month={viewMonth}
                            onMonthChange={setViewMonth}
                            className="rounded-lg"
                            modifiers={{
                                hasFollowUp: datesWithFollowUps,
                            }}
                            modifiersClassNames={{
                                hasFollowUp: "relative",
                            }}
                            components={{
                                DayContent: ({ date }) => {
                                    const status = getDayStatus(date);
                                    const dateKey = format(date, 'yyyy-MM-dd');
                                    const count = (leadsByDate[dateKey] || []).length;

                                    return (
                                        <div className="relative w-full h-full flex items-center justify-center">
                                            <span>{date.getDate()}</span>
                                            {count > 0 && (
                                                <span className={cn(
                                                    "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                                                    getStatusColor(status)
                                                )} />
                                            )}
                                        </div>
                                    );
                                }
                            }}
                        />

                        {/* Legend */}
                        <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-slate-500">Overdue</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-slate-500">Today</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-slate-500">Upcoming</span>
                            </div>
                        </div>
                    </div>

                    {/* Day Details Section */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="px-4 py-3 border-b bg-slate-50">
                            <h3 className="font-bold text-slate-800">
                                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {selectedDateLeads.length} follow-up{selectedDateLeads.length !== 1 ? 's' : ''} scheduled
                            </p>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            {selectedDateLeads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                                    <CalendarClock size={40} className="mb-3 opacity-50" />
                                    <p className="text-sm font-medium">No follow-ups on this day</p>
                                    <p className="text-xs mt-1">Select a date with a colored dot</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDateLeads
                                        .sort((a, b) => {
                                            const timeA = a.next_follow_up ? new Date(a.next_follow_up).getTime() : 0;
                                            const timeB = b.next_follow_up ? new Date(b.next_follow_up).getTime() : 0;
                                            return timeA - timeB;
                                        })
                                        .map((lead) => {
                                            const followUpDate = lead.next_follow_up ? new Date(lead.next_follow_up) : null;
                                            const isOverdue = followUpDate && isBefore(startOfDay(followUpDate), startOfDay(new Date())) && !isToday(followUpDate);

                                            return (
                                                <div
                                                    key={lead.id}
                                                    className={cn(
                                                        "bg-white p-4 rounded-xl border shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group",
                                                        isOverdue && "border-red-200 bg-red-50/30"
                                                    )}
                                                    onClick={() => {
                                                        onLeadClick(lead);
                                                        onOpenChange(false);
                                                    }}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className={cn(
                                                                "font-mono text-xs",
                                                                isOverdue
                                                                    ? "bg-red-50 text-red-600 border-red-200"
                                                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                                            )}>
                                                                <Clock size={10} className="mr-1" />
                                                                {followUpDate ? format(followUpDate, 'h:mm a') : 'All Day'}
                                                            </Badge>
                                                            {isOverdue && (
                                                                <Badge variant="destructive" className="text-[10px] h-5">
                                                                    <AlertCircle size={10} className="mr-1" />
                                                                    Overdue
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                            {lead.status}
                                                        </span>
                                                    </div>

                                                    <h4 className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors mb-2">
                                                        {lead.title}
                                                    </h4>

                                                    <div className="flex flex-wrap gap-3 mb-3 text-xs text-slate-500">
                                                        {lead.contact?.name && (
                                                            <div className="flex items-center gap-1.5">
                                                                <User size={12} className="text-slate-400" />
                                                                <span>{lead.contact.name}</span>
                                                            </div>
                                                        )}
                                                        {lead.contact?.company_name && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Building2 size={12} className="text-slate-400" />
                                                                <span>{lead.contact.company_name}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {lead.next_follow_up_agenda && (
                                                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 italic border border-slate-100 mb-3">
                                                            <span className="font-semibold not-italic text-slate-700">Agenda: </span>
                                                            {lead.next_follow_up_agenda}
                                                        </div>
                                                    )}

                                                    <div className="flex justify-end pt-2 border-t border-slate-100">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 text-xs hover:bg-green-50 hover:text-green-600"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onMarkCompleted(lead.id);
                                                            }}
                                                        >
                                                            <CheckCircle size={14} className="mr-1.5" />
                                                            Mark Done
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
