-- Add delete policy for PMs and POs on default_avatars
CREATE POLICY "PMs and POs can delete custom avatars"
ON public.default_avatars
FOR DELETE
TO authenticated
USING (
  (has_role(auth.uid(), 'project_manager'::app_role) OR has_role(auth.uid(), 'project_owner'::app_role))
  AND category = 'custom'
);