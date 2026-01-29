import React, { useState } from 'react';
import { Lead } from './LeadTable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';
import { CalendarClock, CheckCircle, ArrowRight, User, Building2, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FollowUpCalendarDialog } from './FollowUpCalendarDialog';

interface TodaysAgendaCardProps {
    leads: Lead[]; // Today's leads
    allLeads: Lead[]; // All leads for calendar view
    onLeadClick: (lead: Lead) => void;
    onMarkCompleted: (leadId: string) => void;
}

export const TodaysAgendaCard = ({ leads, allLeads, onLeadClick, onMarkCompleted }: TodaysAgendaCardProps) => {
    const [calendarOpen, setCalendarOpen] = useState(false);

    // Sort by time
    const sortedLeads = [...leads].sort((a, b) => {
        const timeA = a.next_follow_up ? new Date(a.next_follow_up).getTime() : 0;
        const timeB = b.next_follow_up ? new Date(b.next_follow_up).getTime() : 0;
        return timeA - timeB;
    });

    // Filter leads that have follow-ups for calendar
    const leadsWithFollowUps = allLeads.filter(lead =>
        lead.next_follow_up && lead.status !== 'Won' && lead.status !== 'Lost'
    );

    return (
        <>
            <Card className="mb-6 border-blue-100 bg-blue-50/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <CalendarClock size={20} />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800">Today's Agenda</CardTitle>
                                <p className="text-sm text-slate-500 font-medium">
                                    {leads.length > 0 ? (
                                        <>You have <span className="text-blue-600 font-bold">{leads.length}</span> follow-up{leads.length !== 1 ? 's' : ''} scheduled for today.</>
                                    ) : (
                                        <>No follow-ups scheduled for today. You're all caught up! 🎉</>
                                    )}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            onClick={() => setCalendarOpen(true)}
                        >
                            <Calendar size={14} />
                            <span className="hidden sm:inline">View Calendar</span>
                        </Button>
                    </div>
                </CardHeader>
                {leads.length > 0 && (
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {sortedLeads.map((lead) => (
                                <div
                                    key={lead.id}
                                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group flex flex-col justify-between"
                                >
                                    <div onClick={() => onLeadClick(lead)} className="cursor-pointer">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-mono">
                                                {lead.next_follow_up ? format(new Date(lead.next_follow_up), 'h:mm a') : 'All Day'}
                                            </Badge>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500`}>
                                                {lead.status}
                                            </span>
                                        </div>

                                        <h4 className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors mb-1">
                                            {lead.title}
                                        </h4>

                                        <div className="space-y-1 mb-3">
                                            {lead.contact?.name && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <User size={12} className="text-slate-400" />
                                                    <span className="truncate">{lead.contact.name}</span>
                                                </div>
                                            )}
                                            {lead.contact?.company_name && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Building2 size={12} className="text-slate-400" />
                                                    <span className="truncate">{lead.contact.company_name}</span>
                                                </div>
                                            )}
                                        </div>

                                        {lead.next_follow_up_agenda && (
                                            <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 italic border border-slate-100 mb-3">
                                                "{lead.next_follow_up_agenda}"
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end pt-2 border-t border-slate-50">
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
                            ))}
                        </div>
                    </CardContent>
                )}
            </Card>

            <FollowUpCalendarDialog
                open={calendarOpen}
                onOpenChange={setCalendarOpen}
                leads={leadsWithFollowUps}
                onLeadClick={onLeadClick}
                onMarkCompleted={onMarkCompleted}
            />
        </>
    );
};
