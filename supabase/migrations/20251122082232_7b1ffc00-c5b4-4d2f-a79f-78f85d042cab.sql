-- Add new profile fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weapons text[],
ADD COLUMN IF NOT EXISTS skill_set text[],
ADD COLUMN IF NOT EXISTS mission text;

-- Update status column to have proper default if not set
UPDATE public.profiles 
SET status = 'Available' 
WHERE status IS NULL;