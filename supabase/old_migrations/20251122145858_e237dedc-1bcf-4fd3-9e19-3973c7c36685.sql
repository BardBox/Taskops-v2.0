-- Create team_mappings table to track which TMs are assigned to which PMs
CREATE TABLE IF NOT EXISTS public.team_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pm_id, team_member_id)
);

-- Enable RLS
ALTER TABLE public.team_mappings ENABLE ROW LEVEL SECURITY;

-- Only project owners can manage team mappings
CREATE POLICY "Project owners can manage team mappings"
ON public.team_mappings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'project_owner'::app_role));

-- PMs can view their own team mappings
CREATE POLICY "PMs can view their team mappings"
ON public.team_mappings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'project_manager'::app_role) AND pm_id = auth.uid());

-- TMs can view their own mapping
CREATE POLICY "Team members can view their own mapping"
ON public.team_mappings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'team_member'::app_role) AND team_member_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_team_mappings_pm_id ON public.team_mappings(pm_id);
CREATE INDEX idx_team_mappings_team_member_id ON public.team_mappings(team_member_id);

COMMENT ON TABLE public.team_mappings IS 'Maps team members to their assigned project managers';