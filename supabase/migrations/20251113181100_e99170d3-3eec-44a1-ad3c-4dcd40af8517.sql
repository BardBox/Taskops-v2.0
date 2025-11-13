-- Remove 'leadership' from app_role enum by recreating it
-- This requires dropping and recreating dependent objects with CASCADE

-- Step 1: Drop the has_role function with CASCADE (this will drop dependent policies)
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;

-- Step 2: Create new enum without 'leadership'
CREATE TYPE public.app_role_new AS ENUM ('project_owner', 'project_manager', 'team_member');

-- Step 3: Update the user_roles table column
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role_new 
  USING role::text::public.app_role_new;

-- Step 4: Drop old enum and rename new one
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Step 5: Recreate the has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 6: Recreate all the RLS policies
CREATE POLICY "Only PMs can manage roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'project_manager'::app_role));

CREATE POLICY "Only PMs can manage clients" 
ON public.clients 
FOR ALL 
USING (has_role(auth.uid(), 'project_manager'::app_role));

CREATE POLICY "PMs can do everything with tasks" 
ON public.tasks 
FOR ALL 
USING (has_role(auth.uid(), 'project_manager'::app_role));

CREATE POLICY "Team members can update their own tasks" 
ON public.tasks 
FOR UPDATE 
USING ((assignee_id = auth.uid()) AND has_role(auth.uid(), 'team_member'::app_role));

CREATE POLICY "Only owners can view settings" 
ON public.system_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'project_owner'::app_role));

CREATE POLICY "Only owners can update settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'project_owner'::app_role));