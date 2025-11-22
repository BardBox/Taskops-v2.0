-- Fix function search path for security using CREATE OR REPLACE
CREATE OR REPLACE FUNCTION update_gamification_stats_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;