-- Create daily_standups table
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
-- Enable RLS
ALTER TABLE public.daily_standups ENABLE ROW LEVEL SECURITY;
-- Create Policies
-- 1. Everyone can read
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.daily_standups;
CREATE POLICY "Enable read access for all authenticated users" ON public.daily_standups FOR
SELECT TO authenticated USING (true);
-- 2. Only PMs and Owners can insert/update
-- Note: This relies on the auth.uid() having a role in user_roles table.
-- Complex RLS can be tricky, so we'll use a simpler check or rely on application logic + basic auth check.
-- For strict security, we'd check exists(select 1 from user_roles where user_id = auth.uid() and role in ('project_manager', 'project_owner'))
-- But for now, let's allow all authenticated to attempt, and relying on frontend to hide buttons. 
-- Wait, user asked for strict "Everyone in the team can see, but not edit it."
-- Let's add the strict policy.
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