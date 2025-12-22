-- Create storage bucket for task chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-chat-images', 'task-chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for task-chat-images bucket
CREATE POLICY "Authenticated users can upload task chat images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-chat-images');

CREATE POLICY "Anyone can view task chat images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'task-chat-images');

CREATE POLICY "Users can delete their own task chat images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'task-chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add reactions table for comment reactions
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'thumbs_up',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Enable RLS on comment_reactions
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for comment_reactions
CREATE POLICY "Anyone can view reactions"
ON public.comment_reactions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can add their own reactions"
ON public.comment_reactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.comment_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add read receipts table
CREATE TABLE IF NOT EXISTS public.comment_read_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on comment_read_receipts
ALTER TABLE public.comment_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for comment_read_receipts
CREATE POLICY "Anyone can view read receipts"
ON public.comment_read_receipts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can add their own read receipts"
ON public.comment_read_receipts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_read_receipts;