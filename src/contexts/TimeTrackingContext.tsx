import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
// @ts-ignore
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTaskTimeTracking } from "@/hooks/useTaskTimeTracking";

interface TimeTrackingState {
    status: 'active' | 'break' | 'completed' | 'idle';
    clockInTime: string | null;
    lastBreakStart: string | null;
    totalBreakSeconds: number;
    timesheetId: string | null;
    previousSessionsTotal: number; // Seconds from completed sessions today
    previousBreaksTotal: number; // Seconds of break from completed sessions today
}

interface TimeTrackingContextType {
    state: TimeTrackingState;
    clockIn: () => Promise<void>;
    clockOut: () => Promise<void>;
    pauseWork: () => Promise<void>;
    resumeWork: () => Promise<void>;
    isLoading: boolean;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | null>(null);

export const useTimeTracking = () => {
    const context = useContext(TimeTrackingContext);
    if (!context) {
        throw new Error("useTimeTracking must be used within a TimeTrackingProvider");
    }
    return context;
};

export const TimeTrackingProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<TimeTrackingState>({
        status: 'idle',
        clockInTime: null,
        lastBreakStart: null,
        totalBreakSeconds: 0,
        timesheetId: null,
        previousSessionsTotal: 0,
        previousBreaksTotal: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        checkAuthAndFetchStatus();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUserId(session.user.id);
                fetchTodayTimesheet(session.user.id);
            } else {
                setUserId(null);
                setState({
                    status: 'idle',
                    clockInTime: null,
                    lastBreakStart: null,
                    totalBreakSeconds: 0,
                    timesheetId: null,
                    previousSessionsTotal: 0,
                    previousBreaksTotal: 0,
                });
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const checkAuthAndFetchStatus = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUserId(session.user.id);
            fetchTodayTimesheet(session.user.id);
        } else {
            setIsLoading(false);
        }
    };

    const fetchTodayTimesheet = async (uid: string) => {
        try {
            setIsLoading(true);
            const today = new Date().toISOString().split('T')[0];

            // Fetch ALL records for today
            const { data, error } = await supabase
                .from('daily_timesheets')
                .select('*')
                .eq('user_id', uid)
                .eq('date', today);

            if (error) throw error;

            let currentSession = null;
            let totalPastSeconds = 0;
            let totalPastBreaks = 0;

            if (data && data.length > 0) {
                // Calculate previous completed sessions
                data.forEach((session: any) => {
                    if (session.status === 'completed' && session.clock_out_time) {
                        const start = new Date(session.clock_in_time).getTime();
                        const end = new Date(session.clock_out_time).getTime();
                        const duration = Math.max(0, end - start - (session.total_break_seconds || 0) * 1000);
                        totalPastSeconds += Math.floor(duration / 1000);
                        totalPastBreaks += (session.total_break_seconds || 0);
                    } else if (session.status !== 'completed') {
                        // Found an active/break session
                        currentSession = session;
                    }
                });
            }

            if (currentSession) {
                setState({
                    status: currentSession.status as any,
                    clockInTime: currentSession.clock_in_time,
                    lastBreakStart: currentSession.last_break_start,
                    totalBreakSeconds: currentSession.total_break_seconds || 0,
                    timesheetId: currentSession.id,
                    previousSessionsTotal: totalPastSeconds,
                    previousBreaksTotal: totalPastBreaks,
                });
            } else {
                setState({
                    status: 'idle',
                    clockInTime: null,
                    lastBreakStart: null,
                    totalBreakSeconds: 0,
                    timesheetId: null,
                    previousSessionsTotal: totalPastSeconds,
                    previousBreaksTotal: totalPastBreaks,
                });
            }
        } catch (error) {
            console.error("Error fetching timesheet:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const pauseAllActiveTasks = async (uid: string) => {
        // Find all active task timers for this user
        const { data: activeTimers } = await supabase
            .from('task_time_tracking')
            .select('*')
            .eq('user_id', uid)
            .eq('tracking_status', 'active');

        if (activeTimers && activeTimers.length > 0) {
            const now = new Date().toISOString();

            // Update each timer to paused
            for (const timer of activeTimers) {
                // Create a session record first
                const duration = Math.floor((new Date(now).getTime() - new Date(timer.last_active_at || now).getTime()) / 1000);

                await (supabase as any).from('task_time_sessions').insert({
                    task_id: timer.task_id,
                    user_id: uid,
                    started_at: timer.last_active_at,
                    ended_at: now,
                    duration_seconds: duration,
                });

                // Update tracking record
                await supabase
                    .from('task_time_tracking')
                    .update({
                        tracking_status: 'paused',
                        paused_at: now,
                        total_seconds: timer.total_seconds + duration,
                        // Mark as auto-paused by using a metadata field? 
                        // For now we assume if global status is break, tasks are auto-paused.
                        // But to resume correctly, we might need to know WHICH ones were active.
                        // We can check 'updated_at' essentially.
                    })
                    .eq('id', timer.id);
            }
        }
    };

    const resumeAutoPausedTasks = async (uid: string) => {
        // Logic: Find tasks that were paused RECENTLY (e.g. at the exact time of break start)?
        // Or just resume the LAST active task?
        // "Review: The user requested 'resume the task that was active before the break'"

        // Let's find the task that was paused most recently
        const { data: lastPaused } = await supabase
            .from('task_time_tracking')
            .select('*')
            .eq('user_id', uid)
            .eq('tracking_status', 'paused')
            .order('paused_at', { ascending: false })
            .limit(1)
            .single();

        if (lastPaused) {
            // Check if it was paused around the time the break started (within 5 seconds tolerance)
            if (state.lastBreakStart) {
                const breakStart = new Date(state.lastBreakStart).getTime();
                const pauseTime = new Date(lastPaused.paused_at || '').getTime();

                if (Math.abs(breakStart - pauseTime) < 5000) {
                    // Resume this task
                    await supabase
                        .from('task_time_tracking')
                        .update({
                            tracking_status: 'active',
                            last_active_at: new Date().toISOString(),
                            paused_at: null,
                        })
                        .eq('id', lastPaused.id);
                }
            }
        }
    };

    const clockIn = async () => {
        if (!userId) {
            toast.error("Please sign in to clock in");
            return;
        }

        try {
            const now = new Date().toISOString();
            const today = now.split('T')[0];

            // Only block if there is currently an ACTIVE or BREAK session (timesheetId is non-null for active sessions)
            if (state.timesheetId && state.status !== 'completed' && state.status !== 'idle') {
                toast.error("Already clocked in");
                return;
            }

            const { data, error } = await (supabase as any)
                .from('daily_timesheets')
                .insert({
                    user_id: userId,
                    date: today,
                    clock_in_time: now,
                    status: 'active',
                })
                .select()
                .single();

            if (error) throw error;

            setState(prev => ({
                ...prev,
                status: 'active',
                clockInTime: now,
                lastBreakStart: null,
                totalBreakSeconds: 0,
                timesheetId: data.id,
            }));

            toast.success("Clocked in successfully");
        } catch (error: any) {
            console.error("Clock in error:", error);
            toast.error(error.message || "Failed to clock in");
        }
    };

    const clockOut = async () => {
        if (!state.timesheetId || !userId) return;

        try {
            const now = new Date().toISOString();

            // If currently on break, calculate final break duration
            let finalBreakSeconds = state.totalBreakSeconds;
            if (state.status === 'break' && state.lastBreakStart) {
                const breakDuration = Math.floor((new Date(now).getTime() - new Date(state.lastBreakStart).getTime()) / 1000);
                finalBreakSeconds += breakDuration;
            }

            // Stop any active tasks
            await pauseAllActiveTasks(userId);

            const { error } = await (supabase as any)
                .from('daily_timesheets')
                .update({
                    status: 'completed',
                    clock_out_time: now,
                    total_break_seconds: finalBreakSeconds,
                    last_break_start: null // Reset as break is done
                })
                .eq('id', state.timesheetId);

            if (error) throw error;

            // Calculate duration of this session to add to total
            let sessionDuration = 0;
            if (state.clockInTime) {
                const start = new Date(state.clockInTime).getTime();
                const end = new Date(now).getTime();
                sessionDuration = Math.max(0, Math.floor((end - start - finalBreakSeconds * 1000) / 1000));
            }

            setState(prev => ({
                status: 'idle', // Switch to 'idle' to allow re-clock-in
                clockInTime: null,
                lastBreakStart: null,
                totalBreakSeconds: 0,
                timesheetId: null,
                previousSessionsTotal: prev.previousSessionsTotal + sessionDuration,
                previousBreaksTotal: prev.previousBreaksTotal + finalBreakSeconds,
            }));

            toast.success("Clocked out for the day");
        } catch (error: any) {
            console.error("Clock out error:", error);
            toast.error("Failed to clock out");
        }
    };

    const pauseWork = async () => {
        if (!state.timesheetId || !userId) return;

        try {
            const now = new Date().toISOString();

            // Pause all active tasks
            await pauseAllActiveTasks(userId);

            const { error } = await (supabase as any)
                .from('daily_timesheets')
                .update({
                    status: 'break',
                    last_break_start: now,
                })
                .eq('id', state.timesheetId);

            if (error) throw error;

            setState(prev => ({
                ...prev,
                status: 'break',
                lastBreakStart: now,
            }));

            toast.info("Work paused (Break started)");
        } catch (error) {
            console.error("Pause work error:", error);
            toast.error("Failed to pause work");
        }
    };

    const resumeWork = async () => {
        if (!state.timesheetId || !userId || !state.lastBreakStart) return;

        try {
            const now = new Date().toISOString();
            const breakDuration = Math.floor((new Date(now).getTime() - new Date(state.lastBreakStart).getTime()) / 1000);
            const newTotalBreak = state.totalBreakSeconds + breakDuration;

            const { error } = await (supabase as any)
                .from('daily_timesheets')
                .update({
                    status: 'active',
                    last_break_start: null,
                    total_break_seconds: newTotalBreak,
                })
                .eq('id', state.timesheetId);

            if (error) throw error;

            // Update local state first to feel responsive
            setState(prev => ({
                ...prev,
                status: 'active',
                lastBreakStart: null,
                totalBreakSeconds: newTotalBreak,
            }));

            // Auto-resume task
            await resumeAutoPausedTasks(userId);

            toast.success("Work resumed");
        } catch (error) {
            console.error("Resume work error:", error);
            toast.error("Failed to resume work");
        }
    };

    return (
        <TimeTrackingContext.Provider value={{ state, clockIn, clockOut, pauseWork, resumeWork, isLoading }}>
            {children}
        </TimeTrackingContext.Provider>
    );
};
