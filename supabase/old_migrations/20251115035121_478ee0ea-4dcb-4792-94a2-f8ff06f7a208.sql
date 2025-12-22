-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add is_archived to clients table
ALTER TABLE public.clients ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

-- Add project_id to tasks table
ALTER TABLE public.tasks ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create task_comments table for chat functionality
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Anyone can view non-archived projects"
ON public.projects FOR SELECT
USING (NOT is_archived OR is_archived = false);

CREATE POLICY "Owners have full access to projects"
ON public.projects FOR ALL
USING (public.has_role(auth.uid(), 'project_owner'::public.app_role));

CREATE POLICY "PMs can view all projects"
ON public.projects FOR SELECT
USING (public.has_role(auth.uid(), 'project_manager'::public.app_role));

CREATE POLICY "PMs can create projects"
ON public.projects FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'project_manager'::public.app_role));

CREATE POLICY "PMs can update projects"
ON public.projects FOR UPDATE
USING (public.has_role(auth.uid(), 'project_manager'::public.app_role));

CREATE POLICY "TMs can view non-archived projects"
ON public.projects FOR SELECT
USING (public.has_role(auth.uid(), 'team_member'::public.app_role) AND NOT is_archived);

-- RLS Policies for task_comments
CREATE POLICY "Anyone can view comments on tasks they can see"
ON public.task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
  )
);

CREATE POLICY "Authenticated users can create comments"
ON public.task_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
ON public.task_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete any comment"
ON public.task_comments FOR DELETE
USING (public.has_role(auth.uid(), 'project_owner'::public.app_role));

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('task-chat-images', 'task-chat-images', true, 2097152);

-- Storage policies for chat images
CREATE POLICY "Anyone can view chat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-chat-images');

CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-chat-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own chat images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-chat-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own chat images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-chat-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for task_comments updated_at
CREATE TRIGGER update_task_comments_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create default "SMO" project for each existing client
INSERT INTO public.projects (name, client_id, is_default)
SELECT 'SMO', id, true
FROM public.clients;