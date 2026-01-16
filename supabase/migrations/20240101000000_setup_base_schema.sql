-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    birth_month INTEGER,
    birth_day INTEGER,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = id);


-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('project_owner', 'project_manager', 'team_member', 'business_head', 'client')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles are viewable by everyone." ON public.user_roles
    FOR SELECT USING (true);


-- Create clients table (dependency for tasks)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients viewable by authenticated users" ON public.clients FOR SELECT USING (auth.role() = 'authenticated');


-- Create projects table (dependency for tasks)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects viewable by authenticated users" ON public.projects FOR SELECT USING (auth.role() = 'authenticated');


-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE DEFAULT CURRENT_DATE,
    task_name TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id),
    project_id UUID REFERENCES public.projects(id),
    assignee_id UUID REFERENCES public.profiles(id),
    assigned_by_id UUID REFERENCES public.profiles(id),
    deadline TIMESTAMPTZ,
    actual_delivery TIMESTAMPTZ,
    status TEXT DEFAULT 'Not Started',
    urgency TEXT DEFAULT 'Medium',
    asset_link TEXT,
    notes TEXT,
    reference_link_1 TEXT,
    reference_link_2 TEXT,
    reference_link_3 TEXT,
    revision_count INTEGER DEFAULT 0,
    revision_requested_at TIMESTAMPTZ,
    revision_requested_by UUID REFERENCES public.profiles(id),
    is_posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks viewable by authenticated users" ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Tasks editable by authenticated users" ON public.tasks FOR ALL USING (auth.role() = 'authenticated');
