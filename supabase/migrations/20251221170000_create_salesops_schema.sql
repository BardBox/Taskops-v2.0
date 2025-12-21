-- Migration for SalesOPS (Contacts, Leads 2.0, Activities)
-- Run this in Supabase SQL Editor

-- 1. DROP existing leads table to ensure clean state for new ID logic (SalesOPS)
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.sales_activities CASCADE;

-- 2. Create Types/Enums
DO $$ BEGIN
    CREATE TYPE public.lead_status AS ENUM ('New', 'Active', 'Won', 'Lost', 'On Hold');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.follow_up_level AS ENUM ('L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.priority_level AS ENUM ('Low', 'Medium', 'High', 'Immediate');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create Contacts Table
CREATE TABLE public.contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_code SERIAL, -- for 0001 logic (display only)
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    designation TEXT,
    company_name TEXT, -- Simplified from company_id for MVP
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id)
);

-- 4. Create Leads Table (SalesOPS Version)
CREATE TABLE public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_code SERIAL, -- Auto-incrementing ID for display (0001)
    title TEXT NOT NULL,
    contact_id UUID REFERENCES public.contacts(id),
    source TEXT, -- e.g., 'Referral', 'LinkedIn'
    service_interested TEXT[], -- Multi-select array
    owner_id UUID REFERENCES public.profiles(id), -- Assignee
    status public.lead_status DEFAULT 'New',
    follow_up_level public.follow_up_level DEFAULT 'L0',
    next_follow_up TIMESTAMP WITH TIME ZONE,
    expected_value NUMERIC,
    currency TEXT DEFAULT 'USD', -- 'USD', 'INR', 'EUR', 'GBP'
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    priority public.priority_level DEFAULT 'Medium',
    last_activity_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Sales Activities Table
CREATE TABLE public.sales_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'Call', 'Meeting', 'Note', 'System', 'Stage Change'
    summary TEXT,
    outcome_tag TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL, -- This acts as the timestamp
    created_by UUID REFERENCES public.profiles(id)
);

-- 6. Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;

-- 7. Policies (Project Owners see all, others see owned? For MVP PO sees all is main req)
-- Contacts Policies
CREATE POLICY "Contacts viewable by Team" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Contacts insertable by Team" ON public.contacts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Contacts updatable by Team" ON public.contacts FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Leads Policies
CREATE POLICY "Leads viewable by Team" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Leads insertable by Team" ON public.leads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Leads updatable by Team" ON public.leads FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Leads deletable by Owner" ON public.leads FOR DELETE USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'project_owner'));

-- Activities Policies
CREATE POLICY "Activities viewable by Team" ON public.sales_activities FOR SELECT USING (true);
CREATE POLICY "Activities insertable by Team" ON public.sales_activities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Functions
-- Auto-update updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
