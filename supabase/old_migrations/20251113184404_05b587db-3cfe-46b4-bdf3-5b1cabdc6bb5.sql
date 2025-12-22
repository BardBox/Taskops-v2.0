-- Add auto-generated ID columns and premium tag to existing tables
-- DO NOT modify existing columns or functionality

-- Add user_code to profiles table (4-digit auto-incrementing ID)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_code text UNIQUE;

-- Add client_code and premium_tag to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS client_code text UNIQUE,
ADD COLUMN IF NOT EXISTS premium_tag text CHECK (premium_tag IN ('A', 'B', 'C', 'D', 'E'));

-- Create function to generate next user code
CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
  next_code text;
BEGIN
  SELECT COALESCE(MAX(CAST(user_code AS integer)), 0) + 1
  INTO next_num
  FROM public.profiles
  WHERE user_code ~ '^\d+$';
  
  next_code := LPAD(next_num::text, 4, '0');
  RETURN next_code;
END;
$$;

-- Create function to generate next client code
CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
  next_code text;
BEGIN
  SELECT COALESCE(MAX(CAST(client_code AS integer)), 0) + 1
  INTO next_num
  FROM public.clients
  WHERE client_code ~ '^\d+$';
  
  next_code := LPAD(next_num::text, 4, '0');
  RETURN next_code;
END;
$$;

-- Update handle_new_user to assign user_code automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles with auto-generated user_code
  INSERT INTO public.profiles (id, full_name, user_code)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    public.generate_user_code()
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id, 
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'team_member'::app_role)
  );
  
  RETURN new;
END;
$$;

-- Backfill user_code for existing users
DO $$
DECLARE
  user_record RECORD;
  current_code integer := 1;
BEGIN
  FOR user_record IN 
    SELECT id FROM public.profiles WHERE user_code IS NULL ORDER BY created_at
  LOOP
    UPDATE public.profiles 
    SET user_code = LPAD(current_code::text, 4, '0')
    WHERE id = user_record.id;
    current_code := current_code + 1;
  END LOOP;
END $$;

-- Backfill client_code for existing clients
DO $$
DECLARE
  client_record RECORD;
  current_code integer := 1;
BEGIN
  FOR client_record IN 
    SELECT id FROM public.clients WHERE client_code IS NULL ORDER BY created_at
  LOOP
    UPDATE public.clients 
    SET client_code = LPAD(current_code::text, 4, '0')
    WHERE id = client_record.id;
    current_code := current_code + 1;
  END LOOP;
END $$;

-- Update RLS policies for comprehensive role-based access control

-- TASKS TABLE RLS POLICIES
DROP POLICY IF EXISTS "PMs can do everything with tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can update their own tasks" ON public.tasks;

-- Owner has full access to tasks
CREATE POLICY "Owners have full access to tasks"
ON public.tasks
FOR ALL
USING (has_role(auth.uid(), 'project_owner'::app_role));

-- PM can SELECT, INSERT, UPDATE but not DELETE
CREATE POLICY "PMs can view all tasks"
ON public.tasks
FOR SELECT
USING (has_role(auth.uid(), 'project_manager'::app_role));

CREATE POLICY "PMs can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'project_manager'::app_role));

CREATE POLICY "PMs can update all tasks"
ON public.tasks
FOR UPDATE
USING (has_role(auth.uid(), 'project_manager'::app_role));

-- TM can only SELECT their own tasks
CREATE POLICY "TMs can view their own tasks"
ON public.tasks
FOR SELECT
USING (
  has_role(auth.uid(), 'team_member'::app_role) 
  AND assignee_id = auth.uid()
);

-- TM can UPDATE their own non-approved tasks
CREATE POLICY "TMs can update their own non-approved tasks"
ON public.tasks
FOR UPDATE
USING (
  has_role(auth.uid(), 'team_member'::app_role) 
  AND assignee_id = auth.uid() 
  AND status != 'Approved'
);

-- CLIENTS TABLE RLS POLICIES
DROP POLICY IF EXISTS "Only PMs can manage clients" ON public.clients;

-- Owner has full access
CREATE POLICY "Owners have full access to clients"
ON public.clients
FOR ALL
USING (has_role(auth.uid(), 'project_owner'::app_role));

-- PM can SELECT, INSERT, UPDATE but not DELETE
CREATE POLICY "PMs can view clients"
ON public.clients
FOR SELECT
USING (has_role(auth.uid(), 'project_manager'::app_role));

CREATE POLICY "PMs can create clients"
ON public.clients
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'project_manager'::app_role));

CREATE POLICY "PMs can update clients"
ON public.clients
FOR UPDATE
USING (has_role(auth.uid(), 'project_manager'::app_role));

-- TM can only SELECT clients
CREATE POLICY "TMs can view clients"
ON public.clients
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role));

-- USER_ROLES TABLE RLS POLICIES
DROP POLICY IF EXISTS "Only PMs can manage roles" ON public.user_roles;

-- Owner has full access
CREATE POLICY "Owners have full access to user_roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'project_owner'::app_role));

-- PM can only INSERT team_member roles
CREATE POLICY "PMs can create team_member roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'project_manager'::app_role) 
  AND role = 'team_member'::app_role
);

-- PM can view all roles
CREATE POLICY "PMs can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'project_manager'::app_role));

-- TM can view all roles (read-only)
CREATE POLICY "TMs can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role));

-- PROFILES TABLE RLS POLICIES
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Owner has full access
CREATE POLICY "Owners have full access to profiles"
ON public.profiles
FOR ALL
USING (has_role(auth.uid(), 'project_owner'::app_role));

-- PM can INSERT new profiles
CREATE POLICY "PMs can create profiles"
ON public.profiles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'project_manager'::app_role));

-- PM can UPDATE profiles for team members only
CREATE POLICY "PMs can update team member profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'project_manager'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = profiles.id 
    AND role = 'team_member'::app_role
  )
);

-- PM can view all profiles
CREATE POLICY "PMs can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'project_manager'::app_role));

-- TM can view all profiles (read-only)
CREATE POLICY "TMs can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- SYSTEM_SETTINGS TABLE RLS POLICIES (already correct, but ensuring completeness)
-- Owner can read/write (already exists)
-- PM and TM need read access

CREATE POLICY "PMs can view settings"
ON public.system_settings
FOR SELECT
USING (has_role(auth.uid(), 'project_manager'::app_role));

CREATE POLICY "TMs can view settings"
ON public.system_settings
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role));