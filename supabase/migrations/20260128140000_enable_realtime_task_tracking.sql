-- Enable Real-time on task_time_tracking
-- This is required so the UI receives the "stop" event when a database trigger pauses a timer.
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND tablename = 'task_time_tracking'
) THEN ALTER PUBLICATION supabase_realtime
ADD TABLE public.task_time_tracking;
END IF;
END $$;