-- Consolidated Migration for Daily Standup Feature
-- Includes:
-- 1. daily_standups table (Main entries)
-- 2. daily_standup_versions table (History log)
-- 3. RLS policies for both
-- 1. Create daily_standups table
CREATE TABLE IF NOT EXISTS public.daily_standups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    morning_notes TEXT,
    evening_notes TEXT,
    morning_author_id UUID REFERENCES public.profiles(id),
    evening_author_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- 2. Create daily_standup_versions table
CREATE TABLE IF NOT EXISTS public.daily_standup_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    standup_id UUID REFERENCES public.daily_standups(id) ON DELETE CASCADE NOT NULL,
    section TEXT NOT NULL CHECK (section IN ('morning', 'evening')),
    content TEXT,
    edited_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- 3. Enable RLS
ALTER TABLE public.daily_standups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_standup_versions ENABLE ROW LEVEL SECURITY;
-- 4. Policies for Daily Standups
-- Allow read access to everyone
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.daily_standups;
CREATE POLICY "Enable read access for all authenticated users" ON public.daily_standups FOR
SELECT TO authenticated USING (true);
-- Allow write access (INSERT, UPDATE) only to Managers/Owners
DROP POLICY IF EXISTS "Enable write access for managers" ON public.daily_standups;
CREATE POLICY "Enable write access for managers" ON public.daily_standups FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
            AND role IN ('project_manager', 'project_owner')
    )
) WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
            AND role IN ('project_manager', 'project_owner')
    )
);
-- 5. Policies for Versions (History)
-- Allow read access to everyone
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.daily_standup_versions;
CREATE POLICY "Enable read access for all authenticated users" ON public.daily_standup_versions FOR
SELECT TO authenticated USING (true);
-- Allow insert only for Managers/Owners (Immutable history)
DROP POLICY IF EXISTS "Enable insert access for managers" ON public.daily_standup_versions;
CREATE POLICY "Enable insert access for managers" ON public.daily_standup_versions FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_id = auth.uid()
                AND role IN ('project_manager', 'project_owner')
        )
    );
-- Grants
GRANT ALL ON public.daily_standups TO authenticated;
GRANT ALL ON public.daily_standup_versions TO authenticated;
GRANT ALL ON public.daily_standups TO service_role;
GRANT ALL ON public.daily_standup_versions TO service_role;