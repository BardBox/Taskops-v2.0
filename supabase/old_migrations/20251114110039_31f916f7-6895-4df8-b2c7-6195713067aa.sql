-- Fix search_path issues in SECURITY DEFINER functions
-- Ensure all functions use fully qualified table names with explicit 'public.' prefix

-- Update has_role function to be explicit
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update generate_user_code with explicit schema
CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- Update generate_client_code with explicit schema
CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- Update handle_new_user with explicit schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
    COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'team_member'::public.app_role)
  );
  
  RETURN new;
END;
$$;

-- Update update_setting with explicit schema
CREATE OR REPLACE FUNCTION public.update_setting(key text, value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only owners can update settings
  IF NOT public.has_role(auth.uid(), 'project_owner'::public.app_role) THEN
    RAISE EXCEPTION 'Only owners can update settings';
  END IF;

  INSERT INTO public.system_settings (setting_key, setting_value)
  VALUES (key, value)
  ON CONFLICT (setting_key) 
  DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
END;
$$;