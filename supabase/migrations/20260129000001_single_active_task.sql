-- Function to handle Single Active Task logic
CREATE OR REPLACE FUNCTION public.handle_single_active_task() RETURNS TRIGGER AS $$ BEGIN -- If status is being changed to 'In Progress'
    -- We check if the status is actually changing to avoid infinite loops on repeated updates
    IF NEW.status = 'In Progress'
    AND (
        OLD.status IS DISTINCT
        FROM 'In Progress'
    ) THEN -- Update other tasks for this assignee to 'On Hold'
    -- We purposely avoid updating the current row (id != NEW.id)
UPDATE public.tasks
SET status = 'On Hold'
WHERE assignee_id = NEW.assignee_id
    AND status = 'In Progress'
    AND id != NEW.id;
END IF;
return NEW;
END;
$$ LANGUAGE plpgsql;
-- Drop existing trigger if it exists to allow re-running
DROP TRIGGER IF EXISTS ensure_single_active_task ON public.tasks;
-- Create the trigger
CREATE TRIGGER ensure_single_active_task BEFORE
UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_single_active_task();
-- Handle INSERTs as well (if a task is created directly as In Progress)
DROP TRIGGER IF EXISTS ensure_single_active_task_insert ON public.tasks;
CREATE TRIGGER ensure_single_active_task_insert BEFORE
INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_single_active_task();