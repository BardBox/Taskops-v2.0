-- Create system_settings table for storing UI configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id SERIAL PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only owners can manage settings
CREATE POLICY "Only owners can view settings"
ON public.system_settings
FOR SELECT
USING (has_role(auth.uid(), 'project_owner'::app_role));

CREATE POLICY "Only owners can update settings"
ON public.system_settings
FOR ALL
USING (has_role(auth.uid(), 'project_owner'::app_role));

-- Create RPC function for updating settings
CREATE OR REPLACE FUNCTION public.update_setting(key TEXT, value TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only owners can update settings
  IF NOT has_role(auth.uid(), 'project_owner'::app_role) THEN
    RAISE EXCEPTION 'Only owners can update settings';
  END IF;

  INSERT INTO public.system_settings (setting_key, setting_value)
  VALUES (key, value)
  ON CONFLICT (setting_key) 
  DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
END;
$$;

-- Insert default settings
INSERT INTO public.system_settings (setting_key, setting_value) VALUES
  ('theme_primary', '#1F2937'),
  ('theme_accent', '#F4CE63'),
  ('dark_mode_default', 'false'),
  ('highlight_delayed_tasks', 'true')
ON CONFLICT (setting_key) DO NOTHING;