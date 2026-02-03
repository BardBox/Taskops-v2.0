import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format, getDay, getHours } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export interface TeamMemberStats {
    userId: string;
    userName: string;
    avatarUrl: string | null;
    role: string;
    // Work session stats
    totalWorkSeconds: number;
    totalBreakSeconds: number;
    sessionsCount: number;
    avgSessionLength: number;
    // Task stats
    totalTaskSeconds: number;
    taskCount: number;
    // Efficiency (task time / work time)
    efficiencyScore: number;
    // Status
    currentStatus: 'working' | 'break' | 'offline';
    currentTask: string | null;
    clockInTime: string | null;
}

export interface DailyStats {
    date: string;
    dayOfWeek: number;
    totalWorkSeconds: number;
    totalBreakSeconds: number;
    activeUsers: number;
}

export interface HourlyHeatmapData {
    dayOfWeek: number; // 0-6 (Sun-Sat)
    hour: number; // 0-23
    totalMinutes: number;
    sessionCount: number;
}

export interface LiveActivity {
    userId: string;
    userName: string;
    avatarUrl: string | null;
    taskId: string | null;
    taskName: string | null;
    clientName: string | null;
    startedAt: string;
    status: 'working' | 'break';
}

export interface TeamAnalyticsSummary {
    totalTeamHoursToday: number;
    totalTeamBreakToday: number;
    activeUsersNow: number;
    usersOnBreakNow: number;
    avgEfficiencyScore: number;
    totalTasksWorkedToday: number;
}

// ============================================================================
// HOOK
// ============================================================================

export const useTeamAnalytics = (dateFrom?: Date, dateTo?: Date) => {
    const [loading, setLoading] = useState(true);
    const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([]);
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [heatmapData, setHeatmapData] = useState<HourlyHeatmapData[]>([]);
    const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([]);
    const [summary, setSummary] = useState<TeamAnalyticsSummary>({
        totalTeamHoursToday: 0,
        totalTeamBreakToday: 0,
        activeUsersNow: 0,
        usersOnBreakNow: 0,
        avgEfficiencyScore: 0,
        totalTasksWorkedToday: 0,
    });

    const fetchTeamAnalytics = useCallback(async () => {
        try {
            setLoading(true);

            const effectiveDateFrom = dateFrom || subDays(new Date(), 30);
            const effectiveDateTo = dateTo || new Date();

            // 1. Fetch all work sessions in the date range
            const { data: workSessions, error: wsError } = await supabase
                .from("user_work_sessions")
                .select(`
          id,
          user_id,
          session_date,
          login_time,
          logout_time,
          session_seconds,
          is_active,
          is_paused,
          total_paused_seconds,
          profiles:user_id(full_name, avatar_url)
        `)
                .gte("session_date", format(effectiveDateFrom, "yyyy-MM-dd"))
                .lte("session_date", format(effectiveDateTo, "yyyy-MM-dd"))
                .order("login_time", { ascending: false });

            if (wsError) throw wsError;

            // 2. Fetch task time sessions for the same period
            const { data: taskSessions, error: tsError } = await supabase
                .from("task_time_sessions")
                .select(`
          id,
          task_id,
          user_id,
          started_at,
          ended_at,
          duration_seconds,
          tasks:task_id(task_name, clients(name))
        `)
                .gte("started_at", effectiveDateFrom.toISOString())
                .lte("started_at", effectiveDateTo.toISOString());

            if (tsError) throw tsError;

            // 3. Fetch currently active timers for live activity
            const { data: activeTimers, error: atError } = await supabase
                .from("task_time_tracking")
                .select(`
          id,
          task_id,
          user_id,
          is_running,
          started_at,
          profiles:user_id(full_name, avatar_url),
          tasks:task_id(task_name, clients(name))
        `)
                .eq("is_running", true);

            if (atError) throw atError;

            // ========================================================================
            // PROCESS DATA
            // ========================================================================

            // --- TEAM MEMBER STATS ---
            const userMap = new Map<string, TeamMemberStats>();

            // Initialize from work sessions
            (workSessions || []).forEach((ws: any) => {
                const userId = ws.user_id;
                const existing = userMap.get(userId) || {
                    userId,
                    userName: ws.profiles?.full_name || "Unknown",
                    avatarUrl: ws.profiles?.avatar_url,
                    role: "team_member",
                    totalWorkSeconds: 0,
                    totalBreakSeconds: 0,
                    sessionsCount: 0,
                    avgSessionLength: 0,
                    totalTaskSeconds: 0,
                    taskCount: 0,
                    efficiencyScore: 0,
                    currentStatus: 'offline' as const,
                    currentTask: null,
                    clockInTime: null,
                };

                existing.totalWorkSeconds += ws.session_seconds || 0;
                existing.totalBreakSeconds += ws.total_paused_seconds || 0;
                existing.sessionsCount += 1;

                // Track current status from today's active session
                if (ws.is_active) {
                    existing.currentStatus = ws.is_paused ? 'break' : 'working';
                    existing.clockInTime = ws.login_time;
                }

                userMap.set(userId, existing);
            });

            // Add task data
            const userTasksMap = new Map<string, Set<string>>();
            (taskSessions || []).forEach((ts: any) => {
                const userId = ts.user_id;
                const existing = userMap.get(userId);
                if (existing) {
                    existing.totalTaskSeconds += ts.duration_seconds || 0;

                    // Track unique tasks
                    if (!userTasksMap.has(userId)) {
                        userTasksMap.set(userId, new Set());
                    }
                    userTasksMap.get(userId)!.add(ts.task_id);
                }
            });

            // Calculate derived metrics
            userMap.forEach((stats, userId) => {
                stats.taskCount = userTasksMap.get(userId)?.size || 0;
                stats.avgSessionLength = stats.sessionsCount > 0
                    ? Math.round(stats.totalWorkSeconds / stats.sessionsCount)
                    : 0;
                // Efficiency = (task time / work time) * 100, capped at 100
                stats.efficiencyScore = stats.totalWorkSeconds > 0
                    ? Math.min(100, Math.round((stats.totalTaskSeconds / stats.totalWorkSeconds) * 100))
                    : 0;
            });

            const teamStatsArray = Array.from(userMap.values())
                .sort((a, b) => b.totalWorkSeconds - a.totalWorkSeconds);

            setTeamStats(teamStatsArray);

            // --- DAILY STATS ---
            const dailyMap = new Map<string, DailyStats>();
            (workSessions || []).forEach((ws: any) => {
                const dateKey = ws.session_date;
                const existing = dailyMap.get(dateKey) || {
                    date: dateKey,
                    dayOfWeek: getDay(new Date(dateKey)),
                    totalWorkSeconds: 0,
                    totalBreakSeconds: 0,
                    activeUsers: 0,
                };
                existing.totalWorkSeconds += ws.session_seconds || 0;
                existing.totalBreakSeconds += ws.total_paused_seconds || 0;
                dailyMap.set(dateKey, existing);
            });

            // Count unique users per day
            const dailyUsersMap = new Map<string, Set<string>>();
            (workSessions || []).forEach((ws: any) => {
                const dateKey = ws.session_date;
                if (!dailyUsersMap.has(dateKey)) {
                    dailyUsersMap.set(dateKey, new Set());
                }
                dailyUsersMap.get(dateKey)!.add(ws.user_id);
            });
            dailyMap.forEach((stats, dateKey) => {
                stats.activeUsers = dailyUsersMap.get(dateKey)?.size || 0;
            });

            setDailyStats(Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)));

            // --- HEATMAP DATA ---
            const heatmap: HourlyHeatmapData[] = [];
            // Initialize all cells
            for (let day = 0; day < 7; day++) {
                for (let hour = 0; hour < 24; hour++) {
                    heatmap.push({ dayOfWeek: day, hour, totalMinutes: 0, sessionCount: 0 });
                }
            }

            // Populate from task sessions
            (taskSessions || []).forEach((ts: any) => {
                if (ts.started_at) {
                    const startDate = new Date(ts.started_at);
                    const day = getDay(startDate);
                    const hour = getHours(startDate);
                    const idx = day * 24 + hour;
                    if (heatmap[idx]) {
                        heatmap[idx].totalMinutes += Math.round((ts.duration_seconds || 0) / 60);
                        heatmap[idx].sessionCount += 1;
                    }
                }
            });

            setHeatmapData(heatmap);

            // --- LIVE ACTIVITY ---
            const liveAct: LiveActivity[] = [];

            // Add currently active timers
            (activeTimers || []).forEach((at: any) => {
                liveAct.push({
                    userId: at.user_id,
                    userName: at.profiles?.full_name || "Unknown",
                    avatarUrl: at.profiles?.avatar_url,
                    taskId: at.task_id,
                    taskName: at.tasks?.task_name || "Unknown Task",
                    clientName: at.tasks?.clients?.name || null,
                    startedAt: at.started_at,
                    status: 'working',
                });
            });

            // Add users on break (from today's active sessions)
            const today = format(new Date(), "yyyy-MM-dd");
            (workSessions || []).forEach((ws: any) => {
                if (ws.session_date === today && ws.is_active && ws.is_paused) {
                    // Check if not already in the list
                    if (!liveAct.find(la => la.userId === ws.user_id)) {
                        liveAct.push({
                            userId: ws.user_id,
                            userName: ws.profiles?.full_name || "Unknown",
                            avatarUrl: ws.profiles?.avatar_url,
                            taskId: null,
                            taskName: null,
                            clientName: null,
                            startedAt: ws.login_time,
                            status: 'break',
                        });
                    }
                }
            });

            setLiveActivity(liveAct);

            // --- SUMMARY ---
            const todaySessions = (workSessions || []).filter((ws: any) => ws.session_date === today);
            const todayTaskSessions = (taskSessions || []).filter((ts: any) =>
                ts.started_at && format(new Date(ts.started_at), "yyyy-MM-dd") === today
            );

            const todayWorkSeconds = todaySessions.reduce((sum: number, ws: any) => sum + (ws.session_seconds || 0), 0);
            const todayBreakSeconds = todaySessions.reduce((sum: number, ws: any) => sum + (ws.total_paused_seconds || 0), 0);
            const activeNow = todaySessions.filter((ws: any) => ws.is_active && !ws.is_paused).length;
            const onBreakNow = todaySessions.filter((ws: any) => ws.is_active && ws.is_paused).length;
            const avgEff = teamStatsArray.length > 0
                ? Math.round(teamStatsArray.reduce((sum, ts) => sum + ts.efficiencyScore, 0) / teamStatsArray.length)
                : 0;
            const uniqueTasksToday = new Set(todayTaskSessions.map((ts: any) => ts.task_id)).size;

            setSummary({
                totalTeamHoursToday: Math.round(todayWorkSeconds / 3600 * 10) / 10,
                totalTeamBreakToday: Math.round(todayBreakSeconds / 60),
                activeUsersNow: activeNow,
                usersOnBreakNow: onBreakNow,
                avgEfficiencyScore: avgEff,
                totalTasksWorkedToday: uniqueTasksToday,
            });

        } catch (error) {
            console.error("Error fetching team analytics:", error);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo]);

    useEffect(() => {
        fetchTeamAnalytics();
    }, [fetchTeamAnalytics]);

    // Real-time subscription for live updates
    useEffect(() => {
        const channel = supabase
            .channel("team-analytics-live")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "user_work_sessions" },
                () => fetchTeamAnalytics()
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "task_time_tracking" },
                () => fetchTeamAnalytics()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTeamAnalytics]);

    return {
        loading,
        teamStats,
        dailyStats,
        heatmapData,
        liveActivity,
        summary,
        refetch: fetchTeamAnalytics,
    };
};
