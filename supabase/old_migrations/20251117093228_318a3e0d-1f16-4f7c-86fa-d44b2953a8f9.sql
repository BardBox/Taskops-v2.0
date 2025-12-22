-- Create task_collaborators table
CREATE TABLE task_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  added_by_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(task_id, user_id)
);

-- Enable RLS on task_collaborators
ALTER TABLE task_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_collaborators
CREATE POLICY "View collaborators" ON task_collaborators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_collaborators.task_id
    )
  );

CREATE POLICY "PM/PO can add collaborators" ON task_collaborators
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'project_manager'::app_role) OR 
    has_role(auth.uid(), 'project_owner'::app_role)
  );

CREATE POLICY "PM/PO can remove collaborators" ON task_collaborators
  FOR DELETE USING (
    has_role(auth.uid(), 'project_manager'::app_role) OR 
    has_role(auth.uid(), 'project_owner'::app_role)
  );

-- Create task_edit_history table
CREATE TABLE task_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  edited_by_id uuid REFERENCES profiles(id) NOT NULL,
  edited_at timestamptz DEFAULT now() NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  change_description text
);

-- Enable RLS on task_edit_history
ALTER TABLE task_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View edit history" ON task_edit_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_edit_history.task_id
    )
  );

CREATE POLICY "System can insert edit history" ON task_edit_history
  FOR INSERT WITH CHECK (true);

-- Create collaboration_metrics table
CREATE TABLE collaboration_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tasks_with_collaborators integer DEFAULT 0,
  successful_collaborations integer DEFAULT 0,
  collaboration_leadership_score numeric(5,2) DEFAULT 0,
  collaborated_tasks integer DEFAULT 0,
  successful_collaboration_assists integer DEFAULT 0,
  collaboration_participation_score numeric(5,2) DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on collaboration_metrics
ALTER TABLE collaboration_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own collaboration metrics" ON collaboration_metrics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "PM/PO view all collaboration metrics" ON collaboration_metrics
  FOR SELECT USING (
    has_role(auth.uid(), 'project_manager'::app_role) OR 
    has_role(auth.uid(), 'project_owner'::app_role)
  );

CREATE POLICY "System updates collaboration metrics" ON collaboration_metrics
  FOR ALL USING (true);

-- Helper function to check if user is a collaborator
CREATE OR REPLACE FUNCTION is_task_collaborator(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM task_collaborators
    WHERE user_id = _user_id AND task_id = _task_id
  )
$$;

-- Helper function to get collaborator count
CREATE OR REPLACE FUNCTION get_collaborator_count(_task_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM task_collaborators
  WHERE task_id = _task_id
$$;

-- Trigger to enforce max 2 collaborators
CREATE OR REPLACE FUNCTION enforce_max_collaborators()
RETURNS TRIGGER AS $$
DECLARE
  collab_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO collab_count
  FROM task_collaborators
  WHERE task_id = NEW.task_id;
  
  IF collab_count >= 2 THEN
    RAISE EXCEPTION 'Maximum 2 collaborators allowed per task';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_max_collaborators
  BEFORE INSERT ON task_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_collaborators();

-- Trigger to log task edits
CREATE OR REPLACE FUNCTION log_task_edits()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.notes IS DISTINCT FROM NEW.notes THEN
    INSERT INTO task_edit_history (task_id, edited_by_id, field_name, old_value, new_value, change_description)
    VALUES (NEW.id, auth.uid(), 'notes', OLD.notes, NEW.notes, 'Updated task description');
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER task_edit_tracking
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_edits();

-- Trigger to delete edit history when task is approved
CREATE OR REPLACE FUNCTION delete_edit_history_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'Approved' AND NEW.status = 'Approved' THEN
    DELETE FROM task_edit_history WHERE task_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER cleanup_edit_history
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.status = 'Approved')
  EXECUTE FUNCTION delete_edit_history_on_approval();

-- Add RLS policy for collaborators to view tasks
CREATE POLICY "Collaborators can view tasks" ON tasks
  FOR SELECT USING (
    is_task_collaborator(auth.uid(), id)
  );

-- Function to update collaboration metrics
CREATE OR REPLACE FUNCTION update_collaboration_metrics(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tasks_with_collabs integer;
  v_successful_collabs integer;
  v_leadership_score numeric;
  v_collaborated_tasks integer;
  v_successful_assists integer;
  v_participation_score numeric;
BEGIN
  SELECT COUNT(DISTINCT t.id) INTO v_tasks_with_collabs
  FROM tasks t
  INNER JOIN task_collaborators tc ON t.id = tc.task_id
  WHERE t.assignee_id = _user_id;
  
  SELECT COUNT(DISTINCT t.id) INTO v_successful_collabs
  FROM tasks t
  INNER JOIN task_collaborators tc ON t.id = tc.task_id
  WHERE t.assignee_id = _user_id
    AND t.status = 'Approved'
    AND t.actual_delivery IS NOT NULL
    AND t.deadline IS NOT NULL
    AND t.actual_delivery <= t.deadline;
  
  v_leadership_score := CASE 
    WHEN v_tasks_with_collabs > 0 
    THEN (v_successful_collabs::numeric / v_tasks_with_collabs) * 100 
    ELSE 0 
  END;
  
  SELECT COUNT(DISTINCT tc.task_id) INTO v_collaborated_tasks
  FROM task_collaborators tc
  WHERE tc.user_id = _user_id;
  
  SELECT COUNT(DISTINCT tc.task_id) INTO v_successful_assists
  FROM task_collaborators tc
  INNER JOIN tasks t ON tc.task_id = t.id
  WHERE tc.user_id = _user_id
    AND t.status = 'Approved'
    AND t.actual_delivery IS NOT NULL
    AND t.deadline IS NOT NULL
    AND t.actual_delivery <= t.deadline;
  
  v_participation_score := CASE 
    WHEN v_collaborated_tasks > 0 
    THEN (v_successful_assists::numeric / v_collaborated_tasks) * 100 
    ELSE 0 
  END;
  
  INSERT INTO collaboration_metrics (
    user_id,
    tasks_with_collaborators,
    successful_collaborations,
    collaboration_leadership_score,
    collaborated_tasks,
    successful_collaboration_assists,
    collaboration_participation_score,
    last_updated
  )
  VALUES (
    _user_id,
    v_tasks_with_collabs,
    v_successful_collabs,
    v_leadership_score,
    v_collaborated_tasks,
    v_successful_assists,
    v_participation_score,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tasks_with_collaborators = EXCLUDED.tasks_with_collaborators,
    successful_collaborations = EXCLUDED.successful_collaborations,
    collaboration_leadership_score = EXCLUDED.collaboration_leadership_score,
    collaborated_tasks = EXCLUDED.collaborated_tasks,
    successful_collaboration_assists = EXCLUDED.successful_collaboration_assists,
    collaboration_participation_score = EXCLUDED.collaboration_participation_score,
    last_updated = now();
END;
$$;