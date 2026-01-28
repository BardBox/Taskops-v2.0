import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useWorkSession(userId: string | null) {
    const [activeSession, setActiveSession] = useState<any | null>(null);
    const [todaySessions, setTodaySessions] = useState<any[]>([]);

    const fetchSessions = useCallback(async () => {
        if (!userId) return;
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase.from("user_work_sessions")
            .select("*")
            .eq("user_id", userId)
            .eq("session_date", today)
            .order("login_time", { ascending: true });
        setTodaySessions(data || []);
        setActiveSession(data?.find((s: any) => s.is_active) || null);
    }, [userId]);

    const syncTaskTimers = useCallback(async () => {
        if (userId) await supabase.rpc('sync_task_timers_with_work_session' as any, { _user_id: userId });
    }, [userId]);

    const startSession = async () => {
        const today = new Date().toISOString().split('T')[0];
        await supabase.from("user_work_sessions").insert({
            user_id: userId,
            session_date: today,
            login_time: new Date().toISOString(),
            is_active: true,
            is_paused: false
        });
        // Triggers will handle sync, but we call it explicitly for good measure if needed, 
        // though the guide suggests simple client logic.
        // The DB trigger `trigger_sync_task_timers` (if it exists from previous migrations) handles this,
        // but the guide calls it explicitly in the JS hook too.
        await syncTaskTimers();
        await fetchSessions();
    };

    const pauseSession = async () => {
        if (!activeSession) return;
        await supabase.from("user_work_sessions").update({
            is_paused: true,
            paused_at: new Date().toISOString()
        }).eq("id", activeSession.id);
        await syncTaskTimers();
        await fetchSessions();
    };

    const resumeSession = async () => {
        if (!activeSession) return;
        // Note: To be precise, we should calculate total_paused_seconds here, 
        // but the guide simplified it. The DB trigger handles the most critical part.
        await supabase.from("user_work_sessions").update({
            is_paused: false,
            paused_at: null
        }).eq("id", activeSession.id);
        await syncTaskTimers();
        await fetchSessions();
    };

    const endSession = async () => {
        if (!activeSession) return;
        await supabase.from("user_work_sessions").update({
            is_active: false,
            logout_time: new Date().toISOString()
        }).eq("id", activeSession.id);
        await syncTaskTimers();
        await fetchSessions();
    };

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    // Realtime subscription
    useEffect(() => {
        if (!userId) return;
        const channel = supabase.channel(`session-${userId}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "user_work_sessions",
                filter: `user_id=eq.${userId}`
            }, fetchSessions)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userId, fetchSessions]);

    return { activeSession, startSession, pauseSession, resumeSession, endSession };
}
