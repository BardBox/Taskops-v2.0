-- Fix for Time Tracking Analytics
-- This migration adds the missing trigger to log finished sessions into task_time_sessions
-- Without this, the Analytics page remains empty.
CREATE OR REPLACE FUNCTION public.log_task_time_session() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE session_duration INTEGER;
session_start TIMESTAMPTZ;
session_end TIMESTAMPTZ;
BEGIN -- We only care when a timer STOPS (is_running changes from true to false)
IF OLD.is_running = true
AND NEW.is_running = false THEN -- Safety check: Ensure we have a valid start time
IF OLD.started_at IS NOT NULL THEN session_start := OLD.started_at;
-- Use paused_at if set, otherwise now()
session_end := COALESCE(NEW.paused_at, now());
-- Calculate duration for THIS specific session
session_duration := EXTRACT(
    EPOCH
    FROM (session_end - session_start)
)::INTEGER;
-- Only log meaningful sessions (> 1 second)
IF session_duration > 0 THEN
INSERT INTO public.task_time_sessions (
        task_id,
        user_id,
        started_at,
        ended_at,
        duration_seconds
    )
VALUES (
        NEW.task_id,
        NEW.user_id,
        session_start,
        session_end,
        session_duration
    );
END IF;
END IF;
END IF;
RETURN NEW;
END;
$$;
-- Create the trigger on task_time_tracking
DROP TRIGGER IF EXISTS log_task_session_trigger ON public.task_time_tracking;
CREATE TRIGGER log_task_session_trigger
AFTER
UPDATE ON public.task_time_tracking FOR EACH ROW EXECUTE FUNCTION public.log_task_time_session();