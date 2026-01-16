-- Fix lead status type to be TEXT instead of ENUM
ALTER TABLE public.leads ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.leads ALTER COLUMN status TYPE TEXT;
ALTER TABLE public.leads ALTER COLUMN status SET DEFAULT 'New';

-- Drop the enum type if it exists (to avoid confusion)
DROP TYPE IF EXISTS lead_status;
