-- Add pinned column to task_comments table
ALTER TABLE task_comments 
ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;

-- Add pinned_at timestamp
ALTER TABLE task_comments 
ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE;

-- Add pinned_by_id to track who pinned the message
ALTER TABLE task_comments 
ADD COLUMN pinned_by_id UUID REFERENCES profiles(id);