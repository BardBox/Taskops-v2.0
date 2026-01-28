-- Fix Timer Background Running & Real-time Updates
-- 1. Enable Real-time on user_work_sessions
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND tablename = 'user_work_sessions'
) THEN ALTER PUBLICATION supabase_realtime
ADD TABLE public.user_work_sessions;
END IF;
END $$;
-- 2. Define robust sync function
CREATE OR REPLACE FUNCTION public.sync_task_timers_with_work_session(_user_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
UPDATE task_time_tracking
SET is_running = false,
    paused_at = now(),
    total_seconds = total_seconds + GREATEST(
        0,
        EXTRACT(
            EPOCH
            FROM (now() - COALESCE(started_at, now()))
        )::integer
    ),
    updated_at = now()
WHERE user_id = _user_id
    AND is_running = true;
END;
$$;
-- 3. Create Trigger Function
CREATE OR REPLACE FUNCTION public.trigger_sync_task_timers() RETURNS TRIGGER AS $$ BEGIN IF (NEW.is_active = false)
    OR (NEW.is_paused = true) THEN PERFORM public.sync_task_timers_with_work_session(NEW.user_id);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- 4. Create Trigger on user_work_sessions
DROP TRIGGER IF EXISTS sync_task_timers_on_session_change ON public.user_work_sessions;
CREATE TRIGGER sync_task_timers_on_session_change
AFTER
UPDATE ON public.user_work_sessions FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_task_timers();
-- 5. Redefine handle_task_time_tracking
CREATE OR REPLACE FUNCTION public.handle_task_time_tracking() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE affected_user_id UUID;
current_entry RECORD;
elapsed_seconds INTEGER;
is_session_active BOOLEAN;
BEGIN IF OLD.status = NEW.status THEN RETURN NEW;
END IF;
affected_user_id := NEW.assignee_id;
IF affected_user_id IS NULL THEN RETURN NEW;
END IF;
SELECT * INTO current_entry
FROM task_time_tracking
WHERE task_id = NEW.id
    AND user_id = affected_user_id;
IF NEW.status = 'In Progress' THEN
SELECT EXISTS (
        SELECT 1
        FROM user_work_sessions
        WHERE user_id = affected_user_id
            AND session_date = CURRENT_DATE
            AND is_active = true
            AND is_paused = false
    ) INTO is_session_active;
IF current_entry IS NULL THEN
INSERT INTO task_time_tracking (
        task_id,
        user_id,
        is_running,
        started_at,
        last_status
    )
VALUES (
        NEW.id,
        affected_user_id,
        (is_session_active IS TRUE),
        now(),
        NEW.status
    );
ELSE
UPDATE task_time_tracking
SET is_running = (is_session_active IS TRUE),
    started_at = now(),
    last_status = NEW.status,
    updated_at = now()
WHERE id = current_entry.id;
END IF;
ELSIF OLD.status = 'In Progress'
AND NEW.status != 'In Progress' THEN IF current_entry IS NOT NULL
AND current_entry.is_running THEN elapsed_seconds := EXTRACT(
    EPOCH
    FROM (now() - current_entry.started_at)
)::INTEGER;
UPDATE task_time_tracking
SET is_running = false,
    total_seconds = total_seconds + elapsed_seconds,
    paused_at = now(),
    last_status = NEW.status,
    updated_at = now()
WHERE id = current_entry.id;
END IF;
ELSIF NEW.status = 'On Hold' THEN IF current_entry IS NOT NULL
AND current_entry.is_running THEN elapsed_seconds := EXTRACT(
    EPOCH
    FROM (now() - current_entry.started_at)
)::INTEGER;
UPDATE task_time_tracking
SET is_running = false,
    total_seconds = total_seconds + elapsed_seconds,
    paused_at = now(),
    last_status = NEW.status,
    updated_at = now()
WHERE id = current_entry.id;
END IF;
END IF;
RETURN NEW;
END;
$$;