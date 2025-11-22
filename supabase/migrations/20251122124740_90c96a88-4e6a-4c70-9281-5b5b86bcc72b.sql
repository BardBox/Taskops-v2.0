-- Add Posted flag columns for SMO tracking
ALTER TABLE tasks ADD COLUMN is_posted BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN posted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN posted_by UUID REFERENCES profiles(id);

-- Add index for performance
CREATE INDEX idx_tasks_is_posted ON tasks(is_posted);

-- Add RLS policy for posted flag (only task owner and collaborators can update)
CREATE POLICY "Task owner and collaborators can update posted flag"
ON tasks FOR UPDATE
USING (
  assignee_id = auth.uid() OR 
  is_task_collaborator(auth.uid(), id)
);

-- Add columns for revision tracking with comments and attachments
ALTER TABLE tasks ADD COLUMN revision_comment TEXT;
ALTER TABLE tasks ADD COLUMN revision_reference_link TEXT;
ALTER TABLE tasks ADD COLUMN revision_reference_image TEXT;