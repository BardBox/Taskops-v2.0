-- Enable real-time on user_work_sessions table
-- This is REQUIRED for global clock in/out changes to trigger task timer updates
-- Without this, the real-time subscriptions in useTaskTimeTracking hook won't receive events
-- Check if already added and add if not
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'user_work_sessions'
) THEN ALTER PUBLICATION supabase_realtime
ADD TABLE public.user_work_sessions;
RAISE NOTICE 'Added user_work_sessions to supabase_realtime publication';
ELSE RAISE NOTICE 'user_work_sessions already in supabase_realtime publication';
END IF;
END $$;