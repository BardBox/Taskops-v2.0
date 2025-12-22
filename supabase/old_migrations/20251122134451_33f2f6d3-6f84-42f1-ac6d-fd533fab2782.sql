-- Create a function to automatically delete notifications older than 3 days
CREATE OR REPLACE FUNCTION delete_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '3 days';
END;
$$;

-- Create a trigger to run daily cleanup (using pg_cron extension)
-- Note: This requires pg_cron extension to be enabled
-- For immediate cleanup, you can also call this function manually or via a scheduled job

-- Alternative: Create a trigger that runs on insert to clean up old records
CREATE OR REPLACE FUNCTION trigger_delete_old_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete notifications older than 3 days
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '3 days';
  
  RETURN NEW;
END;
$$;

-- Create trigger that runs after each notification insert
CREATE TRIGGER cleanup_old_notifications_trigger
AFTER INSERT ON notifications
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_delete_old_notifications();