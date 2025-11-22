-- Prevent team members from changing task descriptions (notes field)
CREATE OR REPLACE FUNCTION public.prevent_team_member_editing_notes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF has_role(auth.uid(), 'team_member'::public.app_role) AND NEW.notes IS DISTINCT FROM OLD.notes THEN
    RAISE EXCEPTION 'Team members cannot modify task descriptions';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_team_member_editing_notes_trigger ON public.tasks;

CREATE TRIGGER prevent_team_member_editing_notes_trigger
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_team_member_editing_notes();
