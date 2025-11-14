-- Create task_appreciations table for quality star tracking
CREATE TABLE IF NOT EXISTS public.task_appreciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  given_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(task_id, given_by_id)
);

-- Enable RLS
ALTER TABLE public.task_appreciations ENABLE ROW LEVEL SECURITY;

-- Anyone can view appreciations
CREATE POLICY "Anyone can view appreciations"
  ON public.task_appreciations
  FOR SELECT
  USING (true);

-- Owners and PMs can add appreciations
CREATE POLICY "Owners can add appreciations"
  ON public.task_appreciations
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'project_owner'::app_role));

CREATE POLICY "PMs can add appreciations"
  ON public.task_appreciations
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'project_manager'::app_role));

-- Create index for better performance
CREATE INDEX idx_task_appreciations_task_id ON public.task_appreciations(task_id);
CREATE INDEX idx_task_appreciations_given_by ON public.task_appreciations(given_by_id);