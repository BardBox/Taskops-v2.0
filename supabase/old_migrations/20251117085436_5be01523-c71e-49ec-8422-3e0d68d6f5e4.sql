-- Add reference_image column to tasks table
ALTER TABLE tasks ADD COLUMN reference_image TEXT;

-- Create storage bucket for task reference images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-references',
  'task-references',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);

-- RLS policies for task reference images bucket
CREATE POLICY "Anyone can view task reference images"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-references');

CREATE POLICY "Authenticated users can upload task reference images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-references' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own task reference images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-references' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete task reference images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-references' 
  AND auth.role() = 'authenticated'
);