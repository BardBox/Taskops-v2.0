-- Add estimated_minutes column to tasks table for Task Budgeting
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 0;