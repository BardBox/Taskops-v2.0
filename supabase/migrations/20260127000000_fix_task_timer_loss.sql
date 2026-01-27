CREATE OR REPLACE FUNCTION public.sync_task_timers_with_work_session(_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $function$ BEGIN -- When user pauses or stops their global session, we need to pause any running task timers.
    -- CRITICAL FIX: We must calculate and add the elapsed time to total_seconds before stopping.
    -- Previously, this might have just set is_running=false without capturing the last chunk of time.
UPDATE task_time_tracking
SET is_running = false,
    paused_at = now(),
    -- Calculate elapsed seconds since started_at and add to total. Prevent negative values.
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
$function$;