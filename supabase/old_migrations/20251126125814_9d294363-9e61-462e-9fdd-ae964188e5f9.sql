-- Allow team members to view all tasks (so they can self-assign)
-- Drop the restrictive policy and create a more permissive one
DROP POLICY IF EXISTS "TMs can view their own tasks" ON tasks;

-- Create new policy that allows team members to see all tasks
CREATE POLICY "TMs can view all tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'team_member'::app_role));

-- Update the update policy to allow team members to self-assign tasks
DROP POLICY IF EXISTS "TMs can update their own non-approved tasks" ON tasks;

-- Allow team members to update their own tasks or self-assign unassigned tasks
CREATE POLICY "TMs can update their own tasks and self-assign"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'team_member'::app_role) AND (
      assignee_id = auth.uid() OR  -- Can update their own tasks
      assignee_id IS NULL  -- Can assign themselves to unassigned tasks
    ) AND 
    status <> 'Approved'  -- Cannot update approved tasks
  )
  WITH CHECK (
    has_role(auth.uid(), 'team_member'::app_role) AND
    status <> 'Approved'
  );