-- Fix log_task_edits to handle system updates (when auth.uid() is null)
CREATE OR REPLACE FUNCTION public.log_task_edits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Skip logging if no authenticated user (system updates)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

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
$$;