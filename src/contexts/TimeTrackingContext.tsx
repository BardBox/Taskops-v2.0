import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TimeTrackingState {
    status: 'active' | 'break' | 'completed' | 'idle';
    clockInTime: string | null;
    lastBreakStart: string | null;
    totalBreakSeconds: number;
    sessionId: string | null;
    previousSessionsTotal: number;
    previousBreaksTotal: number;
}

interface TimeTrackingContextType {
    state: TimeTrackingState;
    clockIn: () => Promise<void>;
    clockOut: () => Promise<void>;
    pauseWork: () => Promise<void>;
    resumeWork: () => Promise<void>;
    isLoading: boolean;
    userId: string | null;
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
        sessionId: null,
        previousSessionsTotal: 0,
        previousBreaksTotal: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        checkAuthAndFetchStatus();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                setUserId(session.user.id);
                fetchTodaySessions(session.user.id);
            } else {
                setUserId(null);
                resetState();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const resetState = () => {
        setState({
            status: 'idle',
            clockInTime: null,
            lastBreakStart: null,
            totalBreakSeconds: 0,
            sessionId: null,
            previousSessionsTotal: 0,
            previousBreaksTotal: 0,
        });
    };

    const checkAuthAndFetchStatus = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUserId(session.user.id);
            fetchTodaySessions(session.user.id);
        } else {
            setIsLoading(false);
        }
    };

    const fetchTodaySessions = async (uid: string) => {
        try {
            setIsLoading(true);
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('user_work_sessions')
                .select('*')
                .eq('user_id', uid)
                .eq('session_date', today)
                .order('login_time', { ascending: true });

            if (error) throw error;

            let currentSession: any = null;
            let totalPastSeconds = 0;
            let totalPastBreaks = 0;

            if (data && data.length > 0) {
                data.forEach((session) => {
                    if (!session.is_active && session.logout_time) {
                        totalPastSeconds += (session.session_seconds || 0);
                        totalPastBreaks += (session.total_paused_seconds || 0);
                    } else if (session.is_active) {
                        currentSession = session;
                    }
                });
            }

            if (currentSession) {
                let status: 'active' | 'break' = 'active';
                if (currentSession.is_paused) {
                    status = 'break';
                }

                setState({
                    status: status,
                    clockInTime: currentSession.login_time,
                    lastBreakStart: currentSession.paused_at,
                    totalBreakSeconds: currentSession.total_paused_seconds || 0,
                    sessionId: currentSession.id,
                    previousSessionsTotal: totalPastSeconds,
                    previousBreaksTotal: totalPastBreaks,
                });
            } else {
                setState({
                    status: 'idle',
                    clockInTime: null,
                    lastBreakStart: null,
                    totalBreakSeconds: 0,
                    sessionId: null,
                    previousSessionsTotal: totalPastSeconds,
                    previousBreaksTotal: totalPastBreaks,
                });
            }
        } catch (error) {
            console.error("Error fetching work sessions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const syncTaskTimers = async (uid: string) => {
        try {
            await supabase.rpc('sync_task_timers_with_work_session' as any, { _user_id: uid });
        } catch (e) {
            console.error("Failed to sync task timers:", e);
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

            if (state.sessionId && state.status !== 'idle') {
                toast.error("Already clocked in");
                return;
            }

            const { data, error } = await supabase
                .from('user_work_sessions')
                .insert({
                    user_id: userId,
                    session_date: today,
                    login_time: now,
                    is_active: true,
                    is_paused: false,
                    session_seconds: 0
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
                sessionId: data.id,
            }));

            // Auto-start active tasks
            await startInProgressTasks(userId);

            toast.success("Clocked in successfully");
        } catch (error: any) {
            console.error("Clock in error:", error);
            toast.error(error.message || "Failed to clock in");
        }
    };

    const clockOut = async () => {
        if (!state.sessionId || !userId) return;

        try {
            const now = new Date().toISOString();

            let elapsed = 0;
            if (state.clockInTime) {
                elapsed = Math.floor((new Date(now).getTime() - new Date(state.clockInTime).getTime()) / 1000);
            }

            let finalPausedSeconds = state.totalBreakSeconds;
            if (state.status === 'break' && state.lastBreakStart) {
                const currentBreak = Math.floor((new Date(now).getTime() - new Date(state.lastBreakStart).getTime()) / 1000);
                finalPausedSeconds += currentBreak;
            }

            const workedSeconds = Math.max(0, elapsed - finalPausedSeconds);

            const { error } = await supabase
                .from('user_work_sessions')
                .update({
                    is_active: false,
                    is_paused: false,
                    logout_time: now,
                    session_seconds: workedSeconds,
                    total_paused_seconds: finalPausedSeconds,
                    paused_at: null
                })
                .eq('id', state.sessionId);

            if (error) throw error;

            await syncTaskTimers(userId);

            setState(prev => ({
                status: 'idle',
                clockInTime: null,
                lastBreakStart: null,
                totalBreakSeconds: 0,
                sessionId: null,
                previousSessionsTotal: prev.previousSessionsTotal + workedSeconds,
                previousBreaksTotal: prev.previousBreaksTotal + finalPausedSeconds,
            }));

            toast.success("Clocked out for the day");
        } catch (error: any) {
            console.error("Clock out error:", error);
            toast.error("Failed to clock out");
        }
    };

    const pauseWork = async () => {
        if (!state.sessionId || !userId) return;

        try {
            const now = new Date().toISOString();

            let elapsedToNow = 0;
            if (state.clockInTime) {
                const totalElapsed = Math.floor((new Date(now).getTime() - new Date(state.clockInTime).getTime()) / 1000);
                elapsedToNow = Math.max(0, totalElapsed - state.totalBreakSeconds);
            }

            const { error } = await supabase
                .from('user_work_sessions')
                .update({
                    is_paused: true,
                    paused_at: now,
                    session_seconds: elapsedToNow
                })
                .eq('id', state.sessionId);

            if (error) throw error;

            await syncTaskTimers(userId);

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

    const startInProgressTasks = async (uid: string) => {
        try {
            // 1. Find tasks assigned to user that are "In Progress"
            const { data: tasks, error: tasksError } = await supabase
                .from('tasks')
                .select('id')
                .eq('assignee_id', uid)
                .eq('status', 'In Progress');

            if (tasksError) throw tasksError;
            if (!tasks || tasks.length === 0) return;

            // 2. Resume tracking for these tasks
            // We use the ID to update task_time_tracking
            const taskIds = tasks.map(t => t.id);

            // We need to upsert or update. 
            // Update is safer if record exists. If not, maybe we shouldn't auto-start? 
            // Requirement says "resume... start the task timer". 
            // Usually tracking records exist. Let's try update first.

            // To ensure we don't overwrite if it's somehow already running (redundant but safe)
            const { error: updateError } = await supabase
                .from('task_time_tracking')
                .update({
                    is_running: true,
                    started_at: new Date().toISOString(),
                    paused_at: null // Clear pause
                })
                .in('task_id', taskIds)
                .eq('user_id', uid);

            if (updateError) {
                console.error("Failed to auto-resume tasks", updateError);
            } else {
                toast.info(`Resumed ${tasks.length} active task(s)`);
            }

        } catch (error) {
            console.error("Error auto-starting tasks:", error);
        }
    };

    const resumeWork = async () => {
        if (!state.sessionId || !userId || !state.lastBreakStart) return;

        try {
            const now = new Date().toISOString();
            const breakDuration = Math.floor((new Date(now).getTime() - new Date(state.lastBreakStart).getTime()) / 1000);
            const newTotalBreak = state.totalBreakSeconds + breakDuration;

            const { error } = await supabase
                .from('user_work_sessions')
                .update({
                    is_paused: false,
                    paused_at: null,
                    total_paused_seconds: newTotalBreak,
                })
                .eq('id', state.sessionId);

            if (error) throw error;

            setState(prev => ({
                ...prev,
                status: 'active',
                lastBreakStart: null,
                totalBreakSeconds: newTotalBreak,
            }));

            // Auto-resume tasks
            await startInProgressTasks(userId);

            toast.success("Work resumed");
        } catch (error) {
            console.error("Resume work error:", error);
            toast.error("Failed to resume work");
        }
    };

    return (
        <TimeTrackingContext.Provider value={{ state, clockIn, clockOut, pauseWork, resumeWork, isLoading, userId }}>
            {children}
        </TimeTrackingContext.Provider>
    );
};
