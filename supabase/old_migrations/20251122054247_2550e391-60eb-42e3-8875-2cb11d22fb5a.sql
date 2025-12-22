-- Storage policies for showcase-images bucket
CREATE POLICY "Users can view their own showcase images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'showcase-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own showcase images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'showcase-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own showcase images"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'showcase-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own showcase images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'showcase-images' AND auth.uid()::text = (storage.foldername(name))[1]);