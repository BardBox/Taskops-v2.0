-- Add creative_title column to profiles table
ALTER TABLE profiles ADD COLUMN creative_title text;

-- Add comment for documentation
COMMENT ON COLUMN profiles.creative_title IS 'User organizational position or creative specialty (e.g., Senior Designer, Creative Director)';