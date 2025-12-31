-- Create daily_timesheets table
CREATE TABLE IF NOT EXISTS public.daily_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'break', 'completed')),
    clock_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    clock_out_time TIMESTAMPTZ,
    total_break_seconds INTEGER DEFAULT 0,
    last_break_start TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create task_time_sessions table for historical granularity
CREATE TABLE IF NOT EXISTS public.task_time_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_timesheets_user_date ON public.daily_timesheets(user_id, date);
CREATE INDEX IF NOT EXISTS idx_task_time_sessions_task_user ON public.task_time_sessions(task_id, user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_sessions_date ON public.task_time_sessions(started_at);

-- Add RLS policies
ALTER TABLE public.daily_timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for daily_timesheets
CREATE POLICY "Users can view their own timesheets" ON public.daily_timesheets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timesheets" ON public.daily_timesheets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timesheets" ON public.daily_timesheets
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all timesheets
CREATE POLICY "Admins can view all timesheets" ON public.daily_timesheets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('project_owner', 'project_manager', 'business_head')
        )
    );

-- Policies for task_time_sessions
CREATE POLICY "Users can view their own sessions" ON public.task_time_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON public.task_time_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.task_time_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins/Collaborators can view sessions related to tasks they can see
-- (Simplified for now to allow team visibility as tasks are generally shared)
CREATE POLICY "Team members can view all sessions" ON public.task_time_sessions
    FOR SELECT USING (true);
