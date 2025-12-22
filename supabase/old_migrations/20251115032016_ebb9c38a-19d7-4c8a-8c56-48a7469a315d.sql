-- Add new notification types to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS notifications_task_approved boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_task_reopened boolean DEFAULT true;