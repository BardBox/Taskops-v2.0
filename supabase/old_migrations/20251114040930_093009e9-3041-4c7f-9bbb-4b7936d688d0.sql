-- Update RLS policies to allow PMs broader permissions

-- Drop and recreate profiles policies to allow PMs to update all non-owner profiles
DROP POLICY IF EXISTS "PMs can update team member profiles" ON public.profiles;

CREATE POLICY "PMs can update all non-owner profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'project_manager'::app_role) 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'project_owner'::app_role
  )
);

-- Update user_roles policies to allow PMs to insert PM and TM roles (but not owner)
DROP POLICY IF EXISTS "PMs can create team_member roles" ON public.user_roles;

CREATE POLICY "PMs can create non-owner roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'project_manager'::app_role) 
  AND role IN ('team_member'::app_role, 'project_manager'::app_role)
);

-- Add policy to allow PMs to update roles (but not to/from project_owner)
CREATE POLICY "PMs can update non-owner roles"
ON public.user_roles
FOR UPDATE
USING (
  has_role(auth.uid(), 'project_manager'::app_role)
  AND role != 'project_owner'::app_role
)
WITH CHECK (
  has_role(auth.uid(), 'project_manager'::app_role)
  AND role IN ('team_member'::app_role, 'project_manager'::app_role)
);