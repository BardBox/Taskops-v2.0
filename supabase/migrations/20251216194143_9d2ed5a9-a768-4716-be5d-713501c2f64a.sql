-- Create task_time_tracking table for tracking time spent on tasks
CREATE TABLE public.task_time_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tracking_status TEXT NOT NULL DEFAULT 'idle' CHECK (tracking_status IN ('idle', 'active', 'paused', 'stopped')),
  started_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  stopped_at TIMESTAMP WITH TIME ZONE,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_task_time_tracking_task_id ON public.task_time_tracking(task_id);
CREATE INDEX idx_task_time_tracking_user_id ON public.task_time_tracking(user_id);
CREATE INDEX idx_task_time_tracking_status ON public.task_time_tracking(tracking_status);

-- Enable RLS
ALTER TABLE public.task_time_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view time tracking for tasks they can see"
ON public.task_time_tracking FOR SELECT
USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_time_tracking.task_id)
);

CREATE POLICY "System can insert time tracking"
ON public.task_time_tracking FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update time tracking"
ON public.task_time_tracking FOR UPDATE
USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_task_time_tracking_updated_at
BEFORE UPDATE ON public.task_time_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle time tracking on task status changes
CREATE OR REPLACE FUNCTION public.handle_task_time_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tracking_record RECORD;
  v_elapsed_seconds INTEGER;
  v_new_tracking_status TEXT;
  v_collaborator RECORD;
BEGIN
  -- Only process if status changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine new tracking status based on task status
  CASE NEW.status
    WHEN 'In Progress', 'Doing' THEN
      v_new_tracking_status := 'active';
    WHEN 'On Hold', 'Hold', 'In Approval', 'Needs Review' THEN
      v_new_tracking_status := 'paused';
    WHEN 'Approved', 'Cancelled', 'Rejected', 'Done', 'Completed' THEN
      v_new_tracking_status := 'stopped';
    ELSE
      v_new_tracking_status := 'idle';
  END CASE;

  -- Update tracking for assignee (task owner)
  SELECT * INTO v_tracking_record
  FROM task_time_tracking
  WHERE task_id = NEW.id AND user_id = NEW.assignee_id;

  IF NOT FOUND THEN
    -- Create new tracking record for assignee
    INSERT INTO task_time_tracking (task_id, user_id, tracking_status, started_at, last_active_at)
    VALUES (
      NEW.id,
      NEW.assignee_id,
      v_new_tracking_status,
      CASE WHEN v_new_tracking_status = 'active' THEN now() ELSE NULL END,
      CASE WHEN v_new_tracking_status = 'active' THEN now() ELSE NULL END
    );
  ELSE
    -- Calculate elapsed time if was active
    IF v_tracking_record.tracking_status = 'active' AND v_tracking_record.last_active_at IS NOT NULL THEN
      v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_tracking_record.last_active_at))::INTEGER;
    ELSE
      v_elapsed_seconds := 0;
    END IF;

    -- Update existing tracking record
    UPDATE task_time_tracking
    SET 
      tracking_status = v_new_tracking_status,
      total_seconds = total_seconds + v_elapsed_seconds,
      started_at = CASE 
        WHEN v_new_tracking_status = 'active' AND started_at IS NULL THEN now()
        ELSE started_at
      END,
      paused_at = CASE WHEN v_new_tracking_status = 'paused' THEN now() ELSE paused_at END,
      stopped_at = CASE WHEN v_new_tracking_status = 'stopped' THEN now() ELSE stopped_at END,
      last_active_at = CASE WHEN v_new_tracking_status = 'active' THEN now() ELSE NULL END,
      updated_at = now()
    WHERE task_id = NEW.id AND user_id = NEW.assignee_id;
  END IF;

  -- Update tracking for all collaborators
  FOR v_collaborator IN 
    SELECT user_id FROM task_collaborators WHERE task_id = NEW.id
  LOOP
    SELECT * INTO v_tracking_record
    FROM task_time_tracking
    WHERE task_id = NEW.id AND user_id = v_collaborator.user_id;

    IF NOT FOUND THEN
      -- Create new tracking record for collaborator
      INSERT INTO task_time_tracking (task_id, user_id, tracking_status, started_at, last_active_at)
      VALUES (
        NEW.id,
        v_collaborator.user_id,
        v_new_tracking_status,
        CASE WHEN v_new_tracking_status = 'active' THEN now() ELSE NULL END,
        CASE WHEN v_new_tracking_status = 'active' THEN now() ELSE NULL END
      );
    ELSE
      -- Calculate elapsed time if was active
      IF v_tracking_record.tracking_status = 'active' AND v_tracking_record.last_active_at IS NOT NULL THEN
        v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_tracking_record.last_active_at))::INTEGER;
      ELSE
        v_elapsed_seconds := 0;
      END IF;

      -- Update existing tracking record
      UPDATE task_time_tracking
      SET 
        tracking_status = v_new_tracking_status,
        total_seconds = total_seconds + v_elapsed_seconds,
        started_at = CASE 
          WHEN v_new_tracking_status = 'active' AND started_at IS NULL THEN now()
          ELSE started_at
        END,
        paused_at = CASE WHEN v_new_tracking_status = 'paused' THEN now() ELSE paused_at END,
        stopped_at = CASE WHEN v_new_tracking_status = 'stopped' THEN now() ELSE stopped_at END,
        last_active_at = CASE WHEN v_new_tracking_status = 'active' THEN now() ELSE NULL END,
        updated_at = now()
      WHERE task_id = NEW.id AND user_id = v_collaborator.user_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger to call the function on task status changes
CREATE TRIGGER task_status_time_tracking_trigger
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_task_time_tracking();

-- Enable realtime for time tracking table
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_time_tracking;