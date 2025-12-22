-- Update the handle_new_user trigger to also create user_roles entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  
  -- Insert into user_roles (default to role from metadata or team_member)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id, 
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'team_member'::app_role)
  );
  
  RETURN new;
END;
$$;

-- Fix existing users without roles by assigning them project_manager role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'project_manager'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;