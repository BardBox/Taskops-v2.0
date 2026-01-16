-- MASTER FIX: Growth Engine Schema Stabilization
-- Run this entire script in the Supabase SQL Editor to guarantee all columns exist and allow correct input types.

-- 1. FIX CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist and are TEXT (permissive) or correct types
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS contact_code SERIAL;

-- 2. FIX LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status TEXT; -- Vital: TEXT to allow any status
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_level TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up_agenda TEXT; -- Ensure agenda exists
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS expected_value NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS probability INTEGER;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS project_links TEXT[];
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS project_files TEXT[];
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_code SERIAL;

-- Foreign Keys (Safe Add)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'contact_id') THEN
        ALTER TABLE public.leads ADD COLUMN contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'owner_id') THEN
        ALTER TABLE public.leads ADD COLUMN owner_id UUID REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'lead_manager_id') THEN
        ALTER TABLE public.leads ADD COLUMN lead_manager_id UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- 3. FIX TYPES (The "Invalid Input" Fixer)
-- This forces specific columns to be TEXT, removing any restrictive ENUMs that might have blocked "Negotiation" etc.
ALTER TABLE public.leads ALTER COLUMN status TYPE TEXT;
ALTER TABLE public.leads ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.leads ALTER COLUMN status SET DEFAULT 'New';

ALTER TABLE public.leads ALTER COLUMN follow_up_level TYPE TEXT;
ALTER TABLE public.leads ALTER COLUMN currency TYPE TEXT;
ALTER TABLE public.leads ALTER COLUMN priority TYPE TEXT;

-- 4. CLEANUP
-- Drop any potentially conflicting enums to allow clean slate
DROP TYPE IF EXISTS lead_status;
DROP TYPE IF EXISTS follow_up_level_enum; -- if existed

-- 5. RLS POLICIES (Idempotent)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Contacts viewable by authenticated users') THEN
        CREATE POLICY "Contacts viewable by authenticated users" ON public.contacts FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Contacts editable by users') THEN
        CREATE POLICY "Contacts editable by users" ON public.contacts FOR ALL USING (auth.role() = 'authenticated');
    END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leads viewable by authenticated users') THEN
        CREATE POLICY "Leads viewable by authenticated users" ON public.leads FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leads editable by users') THEN
        CREATE POLICY "Leads editable by users" ON public.leads FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
