-- Add reference link columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS reference_link_1 text,
ADD COLUMN IF NOT EXISTS reference_link_2 text,
ADD COLUMN IF NOT EXISTS reference_link_3 text;