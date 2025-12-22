-- Fix Lead Schema & Add Project Reference Fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_links TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_files TEXT[];

-- Enhance Contact Schema (Designation & Socials)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram TEXT;

-- Create Storage Bucket for Project Files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lead_attachments', 'lead_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow Uploads (Simple Policy)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow public uploads' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lead_attachments');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow public view' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Allow public view" ON storage.objects FOR SELECT TO public USING (bucket_id = 'lead_attachments');
    END IF;
END
$$;
