-- Migration: Time Tracking 2.0 Updates
-- Implements "Zombie Session" prevention and stricter status control
-- Overwrites handle_task_time_tracking()
CREATE OR REPLACE FUNCTION public.handle_task_time_tracking() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE affected_user_id UUID;
current_entry RECORD;
elapsed_seconds INTEGER;
active_session RECORD;
BEGIN -- Only process status changes
IF OLD.status = NEW.status THEN RETURN NEW;
END IF;
-- Process for assignee
affected_user_id := NEW.assignee_id;
-- If no assignee, do nothing
IF affected_user_id IS NULL THEN RETURN NEW;
END IF;
-- Get existing time tracking entry
SELECT * INTO current_entry
FROM task_time_tracking
WHERE task_id = NEW.id
    AND user_id = affected_user_id;
-- Status changed TO "In Progress" - START timer
IF NEW.status = 'In Progress' THEN -- STRICT SESSION VALIDATION: Check for active session today
SELECT * INTO active_session
FROM user_work_sessions
WHERE user_id = affected_user_id
    AND session_date = CURRENT_DATE
    AND is_active = true
    AND (
        is_paused = false
        OR is_paused IS NULL
    );
-- If no valid active session, DO NOT START.
-- Optionally we could raise an error, but silent fail/no-start is safer for triggers to avoid blocking UI updates.
-- For 2.0 Spec: We proceed ONLY if valid.
IF active_session IS NOT NULL THEN IF current_entry IS NULL THEN -- Create new entry with running timer
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
        true,
        now(),
        NEW.status
    );
ELSE -- Resume existing timer
UPDATE task_time_tracking
SET is_running = true,
    started_at = now(),
    last_status = NEW.status,
    updated_at = now()
WHERE id = current_entry.id;
END IF;
END IF;
-- Status changed FROM "In Progress" to ANY OTHER STATUS - STRICT STOP
-- Also handles 'On Hold', 'Review', 'Approved', etc.
-- This covers the "Auto-Stop" requirement.
ELSIF NEW.status != 'In Progress' THEN IF current_entry IS NOT NULL
AND current_entry.is_running THEN -- Calculate elapsed time
elapsed_seconds := EXTRACT(
    EPOCH
    FROM (now() - current_entry.started_at)
)::INTEGER;
-- Update with accumulated time and FORCE STOP
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