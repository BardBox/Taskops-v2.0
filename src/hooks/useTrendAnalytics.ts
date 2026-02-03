import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, getWeek } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export interface WeeklyComparison {
    weekLabel: string;
    weekNumber: number;
    totalHours: number;
    avgDailyHours: number;
    activeDays: number;
    efficiency: number;
}

export interface DailyBreakdown {
    date: string;
    dayName: string;
    hours: number;
    sessions: number;
    breaks: number;
}

export interface EfficiencyTrend {
    period: string;
    efficiency: number;
    taskHours: number;
    workHours: number;
}

export interface TrendInsight {
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
    value?: string;
}

export interface TrendsData {
    weeklyComparison: WeeklyComparison[];
    thisWeekDaily: DailyBreakdown[];
    lastWeekDaily: DailyBreakdown[];
    efficiencyTrend: EfficiencyTrend[];
    insights: TrendInsight[];
    peakDay: string;
    peakHour: number;
    avgWeeklyHours: number;
    totalWeeksAnalyzed: number;
}

// ============================================================================
// HOOK
// ============================================================================

export const useTrendAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<TrendsData>({
        weeklyComparison: [],
        thisWeekDaily: [],
        lastWeekDaily: [],
        efficiencyTrend: [],
        insights: [],
        peakDay: 'Monday',
        peakHour: 10,
        avgWeeklyHours: 0,
        totalWeeksAnalyzed: 0,
    });

    const fetchTrends = useCallback(async () => {
        try {
            setLoading(true);

            const today = new Date();
            const weeksBack = 8; // Analyze last 8 weeks
            const startDate = subWeeks(today, weeksBack);

            // Fetch work sessions for the period
            const { data: workSessions, error: wsError } = await supabase
                .from("user_work_sessions")
                .select("session_date, session_seconds, total_paused_seconds, user_id")
                .gte("session_date", format(startDate, "yyyy-MM-dd"))
                .order("session_date", { ascending: true });

            if (wsError) throw wsError;

            // Fetch task sessions for efficiency calculation
            const { data: taskSessions, error: tsError } = await supabase
                .from("task_time_sessions")
                .select("started_at, duration_seconds")
                .gte("started_at", startDate.toISOString());

            if (tsError) throw tsError;

            // ========================================================================
            // PROCESS WEEKLY COMPARISONS
            // ========================================================================

            const weeklyMap = new Map<number, { hours: number; days: Set<string>; taskHours: number }>();

            (workSessions || []).forEach((ws: any) => {
                const weekNum = getWeek(new Date(ws.session_date));
                const existing = weeklyMap.get(weekNum) || { hours: 0, days: new Set<string>(), taskHours: 0 };
                existing.hours += (ws.session_seconds || 0) / 3600;
                existing.days.add(ws.session_date);
                weeklyMap.set(weekNum, existing);
            });

            // Add task hours to weeks
            (taskSessions || []).forEach((ts: any) => {
                if (ts.started_at) {
                    const weekNum = getWeek(new Date(ts.started_at));
                    const existing = weeklyMap.get(weekNum);
                    if (existing) {
                        existing.taskHours += (ts.duration_seconds || 0) / 3600;
                    }
                }
            });

            const weeklyComparison: WeeklyComparison[] = Array.from(weeklyMap.entries())
                .map(([weekNum, data]) => ({
                    weekLabel: `Week ${weekNum}`,
                    weekNumber: weekNum,
                    totalHours: Math.round(data.hours * 10) / 10,
                    avgDailyHours: Math.round((data.hours / data.days.size) * 10) / 10,
                    activeDays: data.days.size,
                    efficiency: data.hours > 0 ? Math.round((data.taskHours / data.hours) * 100) : 0,
                }))
                .sort((a, b) => a.weekNumber - b.weekNumber)
                .slice(-6); // Last 6 weeks

            // ========================================================================
            // THIS WEEK vs LAST WEEK DAILY BREAKDOWN
            // ========================================================================

            const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
            const lastWeekStart = subWeeks(thisWeekStart, 1);
            const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

            const processWeekDaily = (start: Date, end: Date): DailyBreakdown[] => {
                const days = eachDayOfInterval({ start, end });
                return days.map(day => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const daySessions = (workSessions || []).filter((ws: any) => ws.session_date === dateStr);
                    const totalSeconds = daySessions.reduce((sum: number, ws: any) => sum + (ws.session_seconds || 0), 0);
                    const totalBreaks = daySessions.reduce((sum: number, ws: any) => sum + (ws.total_paused_seconds || 0), 0);

                    return {
                        date: dateStr,
                        dayName: format(day, "EEE"),
                        hours: Math.round(totalSeconds / 3600 * 10) / 10,
                        sessions: daySessions.length,
                        breaks: Math.round(totalBreaks / 60),
                    };
                });
            };

            const thisWeekDaily = processWeekDaily(thisWeekStart, today);
            const lastWeekDaily = processWeekDaily(lastWeekStart, lastWeekEnd);

            // ========================================================================
            // EFFICIENCY TREND (Weekly)
            // ========================================================================

            const efficiencyTrend: EfficiencyTrend[] = weeklyComparison.map(w => ({
                period: w.weekLabel,
                efficiency: w.efficiency,
                taskHours: Math.round((w.totalHours * w.efficiency / 100) * 10) / 10,
                workHours: w.totalHours,
            }));

            // ========================================================================
            // INSIGHTS
            // ========================================================================

            const insights: TrendInsight[] = [];

            // Compare this week to last week
            const thisWeekHours = thisWeekDaily.reduce((sum, d) => sum + d.hours, 0);
            const lastWeekHours = lastWeekDaily.reduce((sum, d) => sum + d.hours, 0);

            if (lastWeekHours > 0) {
                const weekChange = ((thisWeekHours - lastWeekHours) / lastWeekHours) * 100;
                if (weekChange > 10) {
                    insights.push({
                        type: 'positive',
                        title: 'Increased Activity',
                        description: `You've logged ${Math.round(weekChange)}% more hours this week compared to last week.`,
                        value: `+${Math.round(weekChange)}%`,
                    });
                } else if (weekChange < -10) {
                    insights.push({
                        type: 'negative',
                        title: 'Decreased Activity',
                        description: `Hours logged are down ${Math.abs(Math.round(weekChange))}% from last week.`,
                        value: `${Math.round(weekChange)}%`,
                    });
                }
            }

            // Find peak day
            const dayTotals: Record<string, number> = {};
            (workSessions || []).forEach((ws: any) => {
                const dayName = format(new Date(ws.session_date), "EEEE");
                dayTotals[dayName] = (dayTotals[dayName] || 0) + (ws.session_seconds || 0);
            });
            const peakDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Monday';

            insights.push({
                type: 'neutral',
                title: 'Peak Activity Day',
                description: `${peakDay} is typically your most productive day of the week.`,
                value: peakDay,
            });

            // Average weekly hours
            const avgWeeklyHours = weeklyComparison.length > 0
                ? Math.round(weeklyComparison.reduce((sum, w) => sum + w.totalHours, 0) / weeklyComparison.length * 10) / 10
                : 0;

            if (avgWeeklyHours > 0) {
                insights.push({
                    type: 'neutral',
                    title: 'Weekly Average',
                    description: `Your team averages ${avgWeeklyHours} hours per week over the analyzed period.`,
                    value: `${avgWeeklyHours}h`,
                });
            }

            // Efficiency trend
            if (efficiencyTrend.length >= 2) {
                const latestEff = efficiencyTrend[efficiencyTrend.length - 1].efficiency;
                const previousEff = efficiencyTrend[efficiencyTrend.length - 2].efficiency;
                if (latestEff > previousEff + 5) {
                    insights.push({
                        type: 'positive',
                        title: 'Efficiency Improving',
                        description: `Efficiency increased from ${previousEff}% to ${latestEff}% week-over-week.`,
                        value: `+${latestEff - previousEff}%`,
                    });
                } else if (latestEff < previousEff - 5) {
                    insights.push({
                        type: 'negative',
                        title: 'Efficiency Declining',
                        description: `Efficiency dropped from ${previousEff}% to ${latestEff}% week-over-week.`,
                        value: `${latestEff - previousEff}%`,
                    });
                }
            }

            setData({
                weeklyComparison,
                thisWeekDaily,
                lastWeekDaily,
                efficiencyTrend,
                insights,
                peakDay,
                peakHour: 10, // Could calculate this from session start times
                avgWeeklyHours,
                totalWeeksAnalyzed: weeklyComparison.length,
            });

        } catch (error) {
            console.error("Error fetching trend analytics:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTrends();
    }, [fetchTrends]);

    return { loading, data, refetch: fetchTrends };
};
