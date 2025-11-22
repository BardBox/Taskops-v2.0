-- Add mood field to profiles table
ALTER TABLE public.profiles
ADD COLUMN mood TEXT;

COMMENT ON COLUMN public.profiles.mood IS 'User''s current mood with emoji';

-- Create default moods in system_settings
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES 
  ('mood_options', '["😊 Happy","😎 Cool","🤔 Thoughtful","😴 Tired","🔥 On Fire","🎯 Focused","🎉 Excited","😌 Relaxed","💪 Motivated","🤯 Overwhelmed"]')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Create default status options in system_settings (if not exists)
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES 
  ('status_options', '["Available","Busy","Out of Office","Do Not Disturb","On Leave"]')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
