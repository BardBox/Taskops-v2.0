-- Drop the restrictive INSERT policy that only allows users to create notifications for themselves
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

-- Create a new policy that allows authenticated users to insert notifications for anyone
-- This enables the system to create notifications for PO/PM when TM performs actions
CREATE POLICY "Authenticated users can insert notifications for anyone" 
ON notifications 
FOR INSERT 
TO authenticated 
WITH CHECK (true);