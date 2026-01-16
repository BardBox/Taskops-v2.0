-- ============================================================
-- COMPLETE DATABASE MIGRATION FOR NEW SUPABASE ENVIRONMENT
-- Project: rsfhrsvtefmxgfdadgij
-- ============================================================
-- Run this ENTIRE script in the Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 1. BASE SCHEMA: profiles, user_roles, clients, projects, tasks
-- ============================================================

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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public profiles are viewable by everyone.' AND tablename = 'profiles') THEN
        CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile.' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile.' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;


-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('project_owner', 'project_manager', 'team_member', 'business_head', 'client')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Roles are viewable by everyone.' AND tablename = 'user_roles') THEN
        CREATE POLICY "Roles are viewable by everyone." ON public.user_roles FOR SELECT USING (true);
    END IF;
END $$;


-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_code TEXT,
    is_archived BOOLEAN DEFAULT false,
    premium_tag TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients viewable by authenticated users' AND tablename = 'clients') THEN
        CREATE POLICY "Clients viewable by authenticated users" ON public.clients FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients editable by authenticated users' AND tablename = 'clients') THEN
        CREATE POLICY "Clients editable by authenticated users" ON public.clients FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Projects viewable by authenticated users' AND tablename = 'projects') THEN
        CREATE POLICY "Projects viewable by authenticated users" ON public.projects FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Projects editable by authenticated users' AND tablename = 'projects') THEN
        CREATE POLICY "Projects editable by authenticated users" ON public.projects FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


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
    reference_image TEXT,
    revision_count INTEGER DEFAULT 0,
    revision_requested_at TIMESTAMPTZ,
    revision_requested_by UUID REFERENCES public.profiles(id),
    is_posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES public.profiles(id),
    is_revision BOOLEAN DEFAULT false,
    parent_task_id UUID,
    approval_date TIMESTAMPTZ,
    priority_sequence INTEGER,
    work_type TEXT,
    current_assignee_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tasks viewable by authenticated users' AND tablename = 'tasks') THEN
        CREATE POLICY "Tasks viewable by authenticated users" ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tasks editable by authenticated users' AND tablename = 'tasks') THEN
        CREATE POLICY "Tasks editable by authenticated users" ON public.tasks FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


-- ============================================================
-- 2. GROWTH ENGINE: contacts, leads, sales_activities
-- ============================================================

-- Create Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_code SERIAL,
    name TEXT,
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

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Contacts viewable by authenticated users' AND tablename = 'contacts') THEN
        CREATE POLICY "Contacts viewable by authenticated users" ON public.contacts FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Contacts editable by users' AND tablename = 'contacts') THEN
        CREATE POLICY "Contacts editable by users" ON public.contacts FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


-- Create Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_code SERIAL,
    title TEXT,
    project_type TEXT,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'New',
    source TEXT,
    next_follow_up TIMESTAMPTZ,
    next_follow_up_agenda TEXT,
    follow_up_level TEXT,
    expected_value NUMERIC,
    currency TEXT DEFAULT 'INR',
    probability INTEGER,
    lead_manager_id UUID REFERENCES public.profiles(id),
    priority TEXT,
    website TEXT,
    linkedin TEXT,
    facebook TEXT,
    instagram TEXT,
    project_links TEXT[],
    project_files TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leads viewable by authenticated users' AND tablename = 'leads') THEN
        CREATE POLICY "Leads viewable by authenticated users" ON public.leads FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leads editable by users' AND tablename = 'leads') THEN
        CREATE POLICY "Leads editable by users" ON public.leads FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


-- Create Sales Activities Table
CREATE TABLE IF NOT EXISTS public.sales_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    summary TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Activities viewable by authenticated users' AND tablename = 'sales_activities') THEN
        CREATE POLICY "Activities viewable by authenticated users" ON public.sales_activities FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Activities editable by users' AND tablename = 'sales_activities') THEN
        CREATE POLICY "Activities editable by users" ON public.sales_activities FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


-- ============================================================
-- 3. TEAM CHAT & BROADCASTS (if needed)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.team_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    edited_at TIMESTAMPTZ,
    reply_to UUID REFERENCES public.team_chat_messages(id),
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Team chat messages viewable by authenticated users' AND tablename = 'team_chat_messages') THEN
        CREATE POLICY "Team chat messages viewable by authenticated users" ON public.team_chat_messages FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Team chat messages editable by authenticated users' AND tablename = 'team_chat_messages') THEN
        CREATE POLICY "Team chat messages editable by authenticated users" ON public.team_chat_messages FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


CREATE TABLE IF NOT EXISTS public.chat_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.team_chat_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Chat reactions viewable by authenticated users' AND tablename = 'chat_reactions') THEN
        CREATE POLICY "Chat reactions viewable by authenticated users" ON public.chat_reactions FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Chat reactions editable by authenticated users' AND tablename = 'chat_reactions') THEN
        CREATE POLICY "Chat reactions editable by authenticated users" ON public.chat_reactions FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Broadcasts viewable by authenticated users' AND tablename = 'broadcasts') THEN
        CREATE POLICY "Broadcasts viewable by authenticated users" ON public.broadcasts FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Broadcasts editable by authenticated users' AND tablename = 'broadcasts') THEN
        CREATE POLICY "Broadcasts editable by authenticated users" ON public.broadcasts FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


-- ============================================================
-- 4. TASK COLLABORATORS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_collaborators ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Task collaborators viewable by authenticated users' AND tablename = 'task_collaborators') THEN
        CREATE POLICY "Task collaborators viewable by authenticated users" ON public.task_collaborators FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Task collaborators editable by authenticated users' AND tablename = 'task_collaborators') THEN
        CREATE POLICY "Task collaborators editable by authenticated users" ON public.task_collaborators FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


-- ============================================================
-- 5. TIME TRACKING TABLES (already applied, but ensure idempotent)
-- ============================================================

-- user_work_sessions (for clock in/out)
CREATE TABLE IF NOT EXISTS public.user_work_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    logout_time TIMESTAMP WITH TIME ZONE,
    session_seconds INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_paused BOOLEAN DEFAULT false,
    paused_at TIMESTAMP WITH TIME ZONE,
    total_paused_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_work_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all work sessions' AND tablename = 'user_work_sessions') THEN
        CREATE POLICY "Users can view all work sessions" ON public.user_work_sessions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own work sessions' AND tablename = 'user_work_sessions') THEN
        CREATE POLICY "Users can manage their own work sessions" ON public.user_work_sessions FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;


-- task_time_tracking (for task timers)
CREATE TABLE IF NOT EXISTS public.task_time_tracking (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    total_seconds INTEGER NOT NULL DEFAULT 0,
    is_running BOOLEAN NOT NULL DEFAULT false,
    last_status TEXT,
    paused_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT task_time_tracking_task_user_unique UNIQUE (task_id, user_id)
);

ALTER TABLE public.task_time_tracking ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all time tracking entries' AND tablename = 'task_time_tracking') THEN
        CREATE POLICY "Users can view all time tracking entries" ON public.task_time_tracking FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own time tracking' AND tablename = 'task_time_tracking') THEN
        CREATE POLICY "Users can manage their own time tracking" ON public.task_time_tracking FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_time_tracking_task_id ON public.task_time_tracking(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_tracking_user_id ON public.task_time_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_tracking_running ON public.task_time_tracking(is_running) WHERE is_running = true;
CREATE INDEX IF NOT EXISTS idx_user_work_sessions_user_id ON public.user_work_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_work_sessions_date ON public.user_work_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_user_work_sessions_active ON public.user_work_sessions(is_active) WHERE is_active = true;


-- ============================================================
-- 6. TIME TRACKING FUNCTIONS & TRIGGERS
-- ============================================================

-- handle_task_time_tracking()
CREATE OR REPLACE FUNCTION public.handle_task_time_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected_user_id UUID;
    current_entry RECORD;
    elapsed_seconds INTEGER;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    affected_user_id := NEW.assignee_id;
    
    IF affected_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT * INTO current_entry
    FROM task_time_tracking
    WHERE task_id = NEW.id AND user_id = affected_user_id;

    IF NEW.status = 'In Progress' THEN
        IF current_entry IS NULL THEN
            INSERT INTO task_time_tracking (task_id, user_id, is_running, started_at, last_status)
            VALUES (NEW.id, affected_user_id, true, now(), NEW.status);
        ELSE
            UPDATE task_time_tracking
            SET is_running = true,
                started_at = now(),
                last_status = NEW.status,
                updated_at = now()
            WHERE id = current_entry.id;
        END IF;

    ELSIF OLD.status = 'In Progress' AND NEW.status != 'In Progress' THEN
        IF current_entry IS NOT NULL AND current_entry.is_running THEN
            elapsed_seconds := EXTRACT(EPOCH FROM (now() - current_entry.started_at))::INTEGER;
            
            UPDATE task_time_tracking
            SET is_running = false,
                total_seconds = total_seconds + elapsed_seconds,
                paused_at = now(),
                last_status = NEW.status,
                updated_at = now()
            WHERE id = current_entry.id;
        END IF;

    ELSIF NEW.status = 'On Hold' THEN
        IF current_entry IS NOT NULL AND current_entry.is_running THEN
            elapsed_seconds := EXTRACT(EPOCH FROM (now() - current_entry.started_at))::INTEGER;
            
            UPDATE task_time_tracking
            SET is_running = false,
                total_seconds = total_seconds + elapsed_seconds,
                paused_at = now(),
                last_status = NEW.status,
                updated_at = now()
            WHERE id = current_entry.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_time_tracking_trigger ON public.tasks;
CREATE TRIGGER task_time_tracking_trigger
    AFTER UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_task_time_tracking();


-- sync_task_timers_with_work_session()
CREATE OR REPLACE FUNCTION public.sync_task_timers_with_work_session(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    work_session RECORD;
    elapsed_seconds INTEGER;
    rec RECORD;
BEGIN
    SELECT * INTO work_session
    FROM user_work_sessions
    WHERE user_id = _user_id
        AND session_date = CURRENT_DATE
        AND is_active = true
    ORDER BY login_time DESC
    LIMIT 1;

    IF work_session IS NULL OR work_session.is_paused = true THEN
        FOR rec IN
            SELECT id, started_at
            FROM task_time_tracking
            WHERE user_id = _user_id AND is_running = true
        LOOP
            elapsed_seconds := EXTRACT(EPOCH FROM (now() - rec.started_at))::INTEGER;
            
            UPDATE task_time_tracking
            SET is_running = false,
                total_seconds = total_seconds + elapsed_seconds,
                paused_at = now(),
                updated_at = now()
            WHERE id = rec.id;
        END LOOP;
    END IF;
END;
$$;


-- init_collaborator_time_tracking()
CREATE OR REPLACE FUNCTION public.init_collaborator_time_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO task_time_tracking (task_id, user_id, is_running, total_seconds)
    VALUES (NEW.task_id, NEW.user_id, false, 0)
    ON CONFLICT (task_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS init_collaborator_time_tracking_trigger ON public.task_collaborators;
CREATE TRIGGER init_collaborator_time_tracking_trigger
    AFTER INSERT ON public.task_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION public.init_collaborator_time_tracking();


-- ============================================================
-- 7. DAILY TIMESHEET SUMMARY VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.daily_timesheet_summary AS
SELECT 
    uws.user_id,
    uws.session_date,
    p.full_name,
    p.avatar_url,
    MIN(uws.login_time) AS first_login,
    MAX(uws.logout_time) AS last_logout,
    SUM(uws.session_seconds) AS total_work_seconds,
    COUNT(uws.id) AS session_count
FROM public.user_work_sessions uws
JOIN public.profiles p ON p.id = uws.user_id
GROUP BY uws.user_id, uws.session_date, p.full_name, p.avatar_url;


-- ============================================================
-- MIGRATION COMPLETE!
-- ============================================================
