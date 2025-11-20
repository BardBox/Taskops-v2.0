-- Add actor information to notifications table
ALTER TABLE notifications 
ADD COLUMN actor_id uuid REFERENCES profiles(id),
ADD COLUMN actor_name text,
ADD COLUMN actor_avatar_url text;

-- Add index for better query performance
CREATE INDEX idx_notifications_actor_id ON notifications(actor_id);
CREATE INDEX idx_notifications_task_id ON notifications(task_id);

-- Update existing notifications to set actor info where possible
UPDATE notifications 
SET actor_id = tasks.assigned_by_id
FROM tasks
WHERE notifications.task_id = tasks.id 
AND notifications.actor_id IS NULL;