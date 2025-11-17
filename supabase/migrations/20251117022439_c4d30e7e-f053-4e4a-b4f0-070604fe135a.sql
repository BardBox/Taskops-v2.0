-- Add revision tracking columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN parent_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
ADD COLUMN revision_number integer DEFAULT 0 NOT NULL,
ADD COLUMN is_revision boolean DEFAULT false NOT NULL;

-- Create index for better performance when querying revisions
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_revision_lookup ON public.tasks(parent_task_id, revision_number) WHERE parent_task_id IS NOT NULL;

-- Update default statuses in system_settings to remove "Revision"
UPDATE public.system_settings 
SET setting_value = '[{"label":"Not Started","color":"bg-status-1"},{"label":"In Progress","color":"bg-status-2"},{"label":"In Approval","color":"bg-status-3"},{"label":"Approved","color":"bg-status-4"},{"label":"On Hold","color":"bg-status-6"},{"label":"Cancelled","color":"bg-status-7"},{"label":"Rejected","color":"bg-status-8"}]'
WHERE setting_key = 'task_statuses';

-- Function to get revision count for a task
CREATE OR REPLACE FUNCTION public.get_revision_count(task_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.tasks
  WHERE parent_task_id = task_id
$$;