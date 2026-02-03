import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, differenceInMinutes } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export interface TimeBlock {
    id: string;
    type: "work" | "break";
    startTime: Date;
    endTime: Date;
    taskName?: string;
    duration: number;
}

export interface IndividualDayData {
    blocks: TimeBlock[];
    totalWorkMinutes: number;
    totalBreakMinutes: number;
    sessionsCount: number;
}

export interface WeeklyData {
    day: string;
    thisWeek: number;
    lastWeek: number;
}

export interface TaskBreakdown {
    taskName: string;
    taskId: string;
    hours: number;
    percentage: number;
    color: string;
}

export interface IndividualAnalytics {
    dayData: IndividualDayData;
    weeklyComparison: WeeklyData[];
    taskBreakdown: TaskBreakdown[];
    efficiency: number;
    avgSessionLength: number;
    totalHoursThisWeek: number;
    longestSession: number;
}

// ============================================================================
// HOOK
// ============================================================================

const CHART_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
];

export const useIndividualAnalytics = (userId: string | null, selectedDate: Date) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<IndividualAnalytics>({
        dayData: { blocks: [], totalWorkMinutes: 0, totalBreakMinutes: 0, sessionsCount: 0 },
        weeklyComparison: [],
        taskBreakdown: [],
        efficiency: 0,
        avgSessionLength: 0,
        totalHoursThisWeek: 0,
        longestSession: 0,
    });

    const fetchIndividualData = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const dayStart = startOfDay(selectedDate);
            const dayEnd = endOfDay(selectedDate);

            // ====================================================================
            // FETCH DAY DATA - Work sessions for timeline
            // ====================================================================
            const { data: workSessions, error: wsError } = await supabase
                .from("user_work_sessions")
                .select("*")
                .eq("user_id", userId)
                .eq("session_date", format(selectedDate, "yyyy-MM-dd"));

            if (wsError) throw wsError;

            // Fetch task sessions for the day
            const { data: taskSessions, error: tsError } = await supabase
                .from("task_time_sessions")
                .select(`
          id,
          started_at,
          ended_at,
          duration_seconds,
          task:task_id(title)
        `)
                .eq("user_id", userId)
                .gte("started_at", dayStart.toISOString())
                .lte("started_at", dayEnd.toISOString());

            if (tsError) throw tsError;

            // Build timeline blocks
            const blocks: TimeBlock[] = [];

            // Add work session blocks
            (workSessions || []).forEach((ws, index) => {
                if (ws.login_time) {
                    const loginTime = new Date(ws.login_time);
                    const logoutTime = ws.logout_time ? new Date(ws.logout_time) : new Date();

                    blocks.push({
                        id: `ws-${ws.id}`,
                        type: "work",
                        startTime: loginTime,
                        endTime: logoutTime,
                        duration: Math.round((ws.session_seconds || 0) / 60),
                    });

                    // Add break block if there was pause time
                    if (ws.total_paused_seconds && ws.total_paused_seconds > 0) {
                        // Estimate break in the middle of the session
                        const midPoint = new Date(loginTime.getTime() + (logoutTime.getTime() - loginTime.getTime()) / 2);
                        const breakDuration = ws.total_paused_seconds / 60;
                        const halfBreak = (breakDuration * 60 * 1000) / 2;

                        blocks.push({
                            id: `break-${ws.id}`,
                            type: "break",
                            startTime: new Date(midPoint.getTime() - halfBreak),
                            endTime: new Date(midPoint.getTime() + halfBreak),
                            duration: Math.round(breakDuration),
                        });
                    }
                }
            });

            // Add task session blocks (overlay on work sessions)
            (taskSessions || []).forEach((ts: any) => {
                if (ts.started_at && ts.ended_at) {
                    blocks.push({
                        id: `task-${ts.id}`,
                        type: "work",
                        startTime: new Date(ts.started_at),
                        endTime: new Date(ts.ended_at),
                        taskName: ts.task?.title || "Unknown Task",
                        duration: Math.round((ts.duration_seconds || 0) / 60),
                    });
                }
            });

            const totalWorkMinutes = (workSessions || []).reduce(
                (sum, ws) => sum + Math.round((ws.session_seconds || 0) / 60),
                0
            );
            const totalBreakMinutes = (workSessions || []).reduce(
                (sum, ws) => sum + Math.round((ws.total_paused_seconds || 0) / 60),
                0
            );

            // ====================================================================
            // WEEKLY COMPARISON - This week vs last week
            // ====================================================================
            const today = new Date();
            const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const last14Days = eachDayOfInterval({
                start: subDays(today, 13),
                end: today,
            });

            const { data: twoWeekSessions } = await supabase
                .from("user_work_sessions")
                .select("session_date, session_seconds")
                .eq("user_id", userId)
                .gte("session_date", format(subDays(today, 13), "yyyy-MM-dd"));

            const weeklyComparison: WeeklyData[] = weekDays.map((day, i) => {
                const thisWeekDate = last14Days[7 + i]; // Days 7-13
                const lastWeekDate = last14Days[i]; // Days 0-6

                const thisWeekHours = (twoWeekSessions || [])
                    .filter(s => s.session_date === format(thisWeekDate, "yyyy-MM-dd"))
                    .reduce((sum, s) => sum + (s.session_seconds || 0) / 3600, 0);

                const lastWeekHours = (twoWeekSessions || [])
                    .filter(s => s.session_date === format(lastWeekDate, "yyyy-MM-dd"))
                    .reduce((sum, s) => sum + (s.session_seconds || 0) / 3600, 0);

                return {
                    day,
                    thisWeek: Math.round(thisWeekHours * 10) / 10,
                    lastWeek: Math.round(lastWeekHours * 10) / 10,
                };
            });

            // ====================================================================
            // TASK BREAKDOWN - Time per task/project
            // ====================================================================
            const { data: allTaskSessions } = await supabase
                .from("task_time_sessions")
                .select(`
          duration_seconds,
          task:task_id(id, title)
        `)
                .eq("user_id", userId)
                .gte("started_at", subDays(today, 7).toISOString());

            const taskMap = new Map<string, { hours: number; name: string }>();
            (allTaskSessions || []).forEach((ts: any) => {
                if (ts.task) {
                    const existing = taskMap.get(ts.task.id) || { hours: 0, name: ts.task.title };
                    existing.hours += (ts.duration_seconds || 0) / 3600;
                    taskMap.set(ts.task.id, existing);
                }
            });

            const totalTaskHours = Array.from(taskMap.values()).reduce((sum, t) => sum + t.hours, 0);
            const taskBreakdown: TaskBreakdown[] = Array.from(taskMap.entries())
                .map(([id, t], i) => ({
                    taskId: id,
                    taskName: t.name,
                    hours: Math.round(t.hours * 10) / 10,
                    percentage: totalTaskHours > 0 ? Math.round((t.hours / totalTaskHours) * 100) : 0,
                    color: CHART_COLORS[i % CHART_COLORS.length],
                }))
                .sort((a, b) => b.hours - a.hours)
                .slice(0, 6);

            // ====================================================================
            // CALCULATE METRICS
            // ====================================================================
            const efficiency = totalWorkMinutes > 0
                ? Math.round((totalWorkMinutes / (totalWorkMinutes + totalBreakMinutes)) * 100)
                : 0;

            const sessionsCount = (workSessions || []).length;
            const avgSessionLength = sessionsCount > 0 ? Math.round(totalWorkMinutes / sessionsCount) : 0;

            const totalHoursThisWeek = weeklyComparison.reduce((sum, d) => sum + d.thisWeek, 0);

            const longestSession = Math.max(
                0,
                ...(workSessions || []).map(ws => Math.round((ws.session_seconds || 0) / 60))
            );

            setData({
                dayData: {
                    blocks: blocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
                    totalWorkMinutes,
                    totalBreakMinutes,
                    sessionsCount,
                },
                weeklyComparison,
                taskBreakdown,
                efficiency,
                avgSessionLength,
                totalHoursThisWeek,
                longestSession,
            });

        } catch (error) {
            console.error("Error fetching individual analytics:", error);
        } finally {
            setLoading(false);
        }
    }, [userId, selectedDate]);

    useEffect(() => {
        fetchIndividualData();
    }, [fetchIndividualData]);

    // Real-time subscription for live updates
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`individual-analytics-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "user_work_sessions",
                    filter: `user_id=eq.${userId}`
                },
                () => fetchIndividualData()
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "task_time_sessions",
                    filter: `user_id=eq.${userId}`
                },
                () => fetchIndividualData()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, fetchIndividualData]);

    return { loading, data, refetch: fetchIndividualData };
};
