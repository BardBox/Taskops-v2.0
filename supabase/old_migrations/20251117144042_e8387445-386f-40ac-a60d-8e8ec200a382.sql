-- Create default_avatars table for storing pre-generated cartoon avatars
CREATE TABLE public.default_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.default_avatars ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view default avatars
CREATE POLICY "Anyone can view default avatars" 
ON public.default_avatars 
FOR SELECT 
USING (true);

-- Only owners can insert/update/delete default avatars
CREATE POLICY "Owners can manage default avatars" 
ON public.default_avatars 
FOR ALL 
USING (has_role(auth.uid(), 'project_owner'::app_role));

-- Create index for faster category filtering
CREATE INDEX idx_default_avatars_category ON public.default_avatars(category);