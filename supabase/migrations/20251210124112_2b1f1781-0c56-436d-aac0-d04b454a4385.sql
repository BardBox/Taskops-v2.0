-- Update the log_task_edits function to track all editable fields
CREATE OR REPLACE FUNCTION public.log_task_edits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip logging if no authenticated user (system updates)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Task name changes
  IF OLD.task_name IS DISTINCT FROM NEW.task_name THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'task_name', OLD.task_name, NEW.task_name, 'Changed task name');
  END IF;

  -- Client changes
  IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'client_id', OLD.client_id::text, NEW.client_id::text, 'Changed client');
  END IF;

  -- Project changes
  IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'project_id', OLD.project_id::text, NEW.project_id::text, 'Changed project');
  END IF;

  -- Assignee changes
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'assignee_id', OLD.assignee_id::text, NEW.assignee_id::text, 'Changed assignee');
  END IF;

  -- Date assigned changes
  IF OLD.date IS DISTINCT FROM NEW.date THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'date', OLD.date::text, NEW.date::text, 'Changed date assigned');
  END IF;

  -- Actual delivery changes
  IF OLD.actual_delivery IS DISTINCT FROM NEW.actual_delivery THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'actual_delivery', OLD.actual_delivery::text, NEW.actual_delivery::text, 'Changed actual delivery date');
  END IF;

  -- Asset link changes
  IF OLD.asset_link IS DISTINCT FROM NEW.asset_link THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'asset_link', OLD.asset_link, NEW.asset_link, 'Updated asset link');
  END IF;

  -- Notes/description changes
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