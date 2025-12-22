-- Add revision counter columns for Approach 2
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS revision_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS revision_requested_by uuid REFERENCES auth.users(id);

-- Create index for revision queries
CREATE INDEX IF NOT EXISTS idx_tasks_revision_count ON public.tasks(revision_count) WHERE revision_count > 0;

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.revision_count IS 'Number of times revision has been requested for this task';
COMMENT ON COLUMN public.tasks.revision_requested_at IS 'Timestamp when the last revision was requested';
COMMENT ON COLUMN public.tasks.revision_requested_by IS 'User ID who requested the last revision';