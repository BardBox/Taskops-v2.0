-- Create daily_standup_versions table
CREATE TABLE IF NOT EXISTS public.daily_standup_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    standup_id UUID REFERENCES public.daily_standups(id) ON DELETE CASCADE NOT NULL,
    section TEXT NOT NULL CHECK (section IN ('morning', 'evening')),
    content TEXT,
    edited_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Enable RLS
ALTER TABLE public.daily_standup_versions ENABLE ROW LEVEL SECURITY;
-- Create Policies
-- 1. Everyone can read
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.daily_standup_versions;
CREATE POLICY "Enable read access for all authenticated users" ON public.daily_standup_versions FOR
SELECT TO authenticated USING (true);
-- 2. Only PMs and Owners can insert (Immutable history log)
DROP POLICY IF EXISTS "Enable write access for managers" ON public.daily_standup_versions;
CREATE POLICY "Enable write access for managers" ON public.daily_standup_versions FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_id = auth.uid()
                AND role IN ('project_manager', 'project_owner')
        )
    );
-- Fix for permissions if needed
GRANT ALL ON public.daily_standup_versions TO authenticated;
GRANT ALL ON public.daily_standup_versions TO service_role;