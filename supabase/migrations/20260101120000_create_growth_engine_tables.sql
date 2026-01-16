-- Create Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_code SERIAL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    designation TEXT,
    company_name TEXT,
    tags TEXT[],
    website TEXT,
    linkedin TEXT,
    facebook TEXT,
    instagram TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contacts viewable by authenticated users" ON public.contacts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Contacts editable by users" ON public.contacts FOR ALL USING (auth.role() = 'authenticated');

-- Create Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_code SERIAL,
    title TEXT NOT NULL,
    project_type TEXT,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'New',
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ops fields
    next_follow_up TIMESTAMPTZ,
    follow_up_level TEXT,
    expected_value NUMERIC,
    currency TEXT DEFAULT 'INR',
    probability INTEGER,
    
    -- Manager/Priority
    lead_manager_id UUID REFERENCES public.profiles(id),
    priority TEXT,

    -- Socials/Info
    website TEXT,
    linkedin TEXT,
    facebook TEXT,
    instagram TEXT,
    
    -- Assets
    project_links TEXT[],
    project_files TEXT[]
);

-- Enable RLS for Leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leads viewable by authenticated users" ON public.leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Leads editable by users" ON public.leads FOR ALL USING (auth.role() = 'authenticated');

-- Create Sales Activities Table
CREATE TABLE IF NOT EXISTS public.sales_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- Call, Email, Meeting, etc.
    summary TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Activities
ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activities viewable by authenticated users" ON public.sales_activities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Activities editable by users" ON public.sales_activities FOR ALL USING (auth.role() = 'authenticated');
