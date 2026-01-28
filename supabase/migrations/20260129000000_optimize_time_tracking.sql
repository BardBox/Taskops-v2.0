-- 1. Create Tables (If they don't exist)
CREATE TABLE IF NOT EXISTS public.user_work_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    session_date date DEFAULT CURRENT_DATE,
    login_time timestamptz DEFAULT now(),
    logout_time timestamptz,
    session_seconds integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_paused boolean DEFAULT false,
    paused_at timestamptz,
    total_paused_seconds integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.task_time_tracking (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    started_at timestamptz,
    paused_at timestamptz,
    total_seconds integer DEFAULT 0,
    is_running boolean DEFAULT false,
    last_status text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- 2. Sync Function (Global Session -> Tasks)
-- This ensures that when you Clock Out or Go on Break, all tasks pause.
CREATE OR REPLACE FUNCTION public.sync_task_timers_with_work_session(_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE has_active_session boolean;
session_is_paused boolean;
BEGIN -- Check active session for TODAY
SELECT is_active,
    COALESCE(is_paused, false) INTO has_active_session,
    session_is_paused
FROM user_work_sessions
WHERE user_id = _user_id
    AND is_active = true
    AND session_date = CURRENT_DATE
ORDER BY login_time DESC
LIMIT 1;
IF has_active_session IS NULL THEN has_active_session := false;
session_is_paused := false;
END IF;
-- Sync existing timers
IF has_active_session
AND NOT session_is_paused THEN -- Resume paused timers if we are working
UPDATE task_time_tracking
SET is_running = true,
    started_at = now(),
    paused_at = null,
    last_status = 'In Progress'
WHERE user_id = _user_id
    AND is_running = false
    AND last_status = 'paused_on_break'
    AND EXISTS (
        SELECT 1
        FROM tasks t
        WHERE t.id = task_time_tracking.task_id
            AND t.status = 'In Progress'
    );
ELSE -- Pause running timers if we are on break or clocked out
UPDATE task_time_tracking
SET is_running = false,
    paused_at = now(),
    total_seconds = total_seconds + COALESCE(
        EXTRACT(
            EPOCH
            FROM (now() - started_at)
        )::integer,
        0
    ),
    last_status = 'paused_on_break'
WHERE user_id = _user_id
    AND is_running = true;
END IF;
END;
$$;
-- 3. Status Trigger (Task Status Change -> Timer)
-- This ensures that changing a task to "In Progress" starts the timer (if clocked in).
CREATE OR REPLACE FUNCTION public.handle_task_time_tracking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE tracking_record RECORD;
elapsed_seconds INTEGER;
has_active_session boolean;
session_is_paused boolean;
BEGIN IF OLD.status IS NOT DISTINCT
FROM NEW.status THEN RETURN NEW;
END IF;
-- Check Global Session
SELECT is_active,
    COALESCE(is_paused, false) INTO has_active_session,
    session_is_paused
FROM user_work_sessions
WHERE user_id = NEW.assignee_id
    AND is_active = true
    AND session_date = CURRENT_DATE
ORDER BY login_time DESC
LIMIT 1;
IF has_active_session IS NULL THEN has_active_session := false;
session_is_paused := false;
END IF;
-- Get Tracking Record
SELECT * INTO tracking_record
FROM task_time_tracking
WHERE task_id = NEW.id
    AND user_id = NEW.assignee_id;
-- LOGIC
IF NEW.status = 'In Progress' THEN IF tracking_record.id IS NULL THEN -- Create new timer
INSERT INTO task_time_tracking (
        task_id,
        user_id,
        is_running,
        last_status,
        started_at
    )
VALUES (
        NEW.id,
        NEW.assignee_id,
        has_active_session
        AND NOT session_is_paused,
        CASE
            WHEN has_active_session
            AND NOT session_is_paused THEN 'In Progress'
            ELSE 'paused_on_break'
        END,
        CASE
            WHEN has_active_session
            AND NOT session_is_paused THEN now()
            ELSE NULL
        END
    );
ELSIF NOT tracking_record.is_running THEN -- Resume timer if working
IF has_active_session
AND NOT session_is_paused THEN
UPDATE task_time_tracking
SET is_running = true,
    started_at = now(),
    last_status = 'In Progress',
    updated_at = now()
WHERE id = tracking_record.id;
ELSE
UPDATE task_time_tracking
SET last_status = 'paused_on_break',
    updated_at = now()
WHERE id = tracking_record.id;
END IF;
END IF;
ELSE -- STOP Timer for any other status
IF tracking_record.id IS NOT NULL
AND tracking_record.is_running THEN elapsed_seconds := EXTRACT(
    EPOCH
    FROM (now() - tracking_record.started_at)
)::INTEGER;
UPDATE task_time_tracking
SET is_running = false,
    paused_at = now(),
    total_seconds = total_seconds + elapsed_seconds,
    last_status = NEW.status,
    updated_at = now()
WHERE id = tracking_record.id;
END IF;
END IF;
RETURN NEW;
END;
$function$;
-- Apply Trigger
DROP TRIGGER IF EXISTS on_task_status_change_time_tracking ON tasks;
CREATE TRIGGER on_task_status_change_time_tracking
AFTER
UPDATE OF status ON tasks FOR EACH ROW EXECUTE FUNCTION handle_task_time_tracking();