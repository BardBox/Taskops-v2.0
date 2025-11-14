-- Add notification sound preferences to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS notifications_sound_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_sound_volume real DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS notifications_sound_type text DEFAULT 'default';

-- Check constraint for volume (between 0 and 1)
ALTER TABLE public.user_preferences
ADD CONSTRAINT check_volume_range CHECK (notifications_sound_volume >= 0 AND notifications_sound_volume <= 1);