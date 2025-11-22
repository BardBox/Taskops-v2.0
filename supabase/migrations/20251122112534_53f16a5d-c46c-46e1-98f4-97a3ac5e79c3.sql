-- Add approval_date column to tasks to track when task was approved
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approval_date timestamp with time zone;

-- Add version_snapshot column to task_edit_history to store full content
ALTER TABLE task_edit_history ADD COLUMN IF NOT EXISTS version_snapshot text;

-- Drop the old trigger that deletes history on approval
DROP TRIGGER IF EXISTS delete_edit_history_on_approval_trigger ON tasks;

-- Update the function to NOT delete history, but mark approval date
CREATE OR REPLACE FUNCTION public.mark_task_approval_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status != 'Approved' AND NEW.status = 'Approved' THEN
    NEW.approval_date = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Create new trigger for marking approval date
CREATE TRIGGER mark_approval_date_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION mark_task_approval_date();

-- Enhanced logging function that captures full version snapshots
CREATE OR REPLACE FUNCTION public.log_task_edits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.notes IS DISTINCT FROM NEW.notes THEN
    INSERT INTO task_edit_history (
      task_id, 
      edited_by_id, 
      field_name, 
      old_value, 
      new_value, 
      version_snapshot,
      change_description
    )
    VALUES (
      NEW.id, 
      auth.uid(), 
      'notes', 
      OLD.notes, 
      NEW.notes, 
      NEW.notes,
      'Updated task description'
    );
  END IF;
  
  IF OLD.reference_link_1 IS DISTINCT FROM NEW.reference_link_1 THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'reference_link_1', OLD.reference_link_1, NEW.reference_link_1, 'Updated reference link 1');
  END IF;
  
  IF OLD.reference_link_2 IS DISTINCT FROM NEW.reference_link_2 THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'reference_link_2', OLD.reference_link_2, NEW.reference_link_2, 'Updated reference link 2');
  END IF;
  
  IF OLD.reference_link_3 IS DISTINCT FROM NEW.reference_link_3 THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'reference_link_3', OLD.reference_link_3, NEW.reference_link_3, 'Updated reference link 3');
  END IF;
  
  IF OLD.reference_image IS DISTINCT FROM NEW.reference_image THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'reference_image', OLD.reference_image, NEW.reference_image, 'Updated reference image');
  END IF;
  
  IF OLD.deadline IS DISTINCT FROM NEW.deadline THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'deadline', OLD.deadline::text, NEW.deadline::text, 'Updated deadline');
  END IF;
  
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status, 'Changed status from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  
  IF OLD.urgency IS DISTINCT FROM NEW.urgency THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'urgency', OLD.urgency, NEW.urgency, 'Changed urgency from ' || OLD.urgency || ' to ' || NEW.urgency);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function to clean up old history (60 days after approval)
CREATE OR REPLACE FUNCTION public.cleanup_old_task_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM task_edit_history
  WHERE task_id IN (
    SELECT id FROM tasks
    WHERE approval_date IS NOT NULL
    AND approval_date < now() - interval '60 days'
  );
END;
$function$;