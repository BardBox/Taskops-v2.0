-- Migration: Full Time Tracking Implementation
-- Based on time-tracking-documentation.md
-- This migration is IDEMPOTENT - safe to run multiple times

-- 1. Create task_time_tracking Table
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

-- Ensure columns exist if table already existed with old schema
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task_time_tracking' AND column_name = 'is_running') THEN
        ALTER TABLE public.task_time_tracking ADD COLUMN is_running BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task_time_tracking' AND column_name = 'started_at') THEN
        ALTER TABLE public.task_time_tracking ADD COLUMN started_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task_time_tracking' AND column_name = 'paused_at') THEN
        ALTER TABLE public.task_time_tracking ADD COLUMN paused_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task_time_tracking' AND column_name = 'last_status') THEN
        ALTER TABLE public.task_time_tracking ADD COLUMN last_status TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task_time_tracking' AND column_name = 'total_seconds') THEN
        ALTER TABLE public.task_time_tracking ADD COLUMN total_seconds INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Handle legacy column migration (tracking_status -> is_running)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task_time_tracking' AND column_name = 'tracking_status') THEN
        -- Migrate data from old enum column to new boolean
        UPDATE public.task_time_tracking SET is_running = (tracking_status::text = 'active') WHERE is_running IS NULL OR is_running = false;
        -- Drop the old column
        ALTER TABLE public.task_time_tracking DROP COLUMN tracking_status;
    END IF;
END $$;

-- Indexes for task_time_tracking
CREATE INDEX IF NOT EXISTS idx_task_time_tracking_task_id ON public.task_time_tracking(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_tracking_user_id ON public.task_time_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_tracking_running ON public.task_time_tracking(is_running) WHERE is_running = true;

-- 2. Create user_work_sessions Table
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

-- Indexes for user_work_sessions
CREATE INDEX IF NOT EXISTS idx_user_work_sessions_user_id ON public.user_work_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_work_sessions_date ON public.user_work_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_user_work_sessions_active ON public.user_work_sessions(is_active) WHERE is_active = true;

-- 3. Create daily_timesheet_summary View
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

-- 4. RLS Policies
ALTER TABLE public.task_time_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_work_sessions ENABLE ROW LEVEL SECURITY;

-- task_time_tracking policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all time tracking entries' AND tablename = 'task_time_tracking') THEN
        CREATE POLICY "Users can view all time tracking entries" ON public.task_time_tracking FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own time tracking' AND tablename = 'task_time_tracking') THEN
        CREATE POLICY "Users can manage their own time tracking" ON public.task_time_tracking FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- user_work_sessions policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all work sessions' AND tablename = 'user_work_sessions') THEN
        CREATE POLICY "Users can view all work sessions" ON public.user_work_sessions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own work sessions' AND tablename = 'user_work_sessions') THEN
        CREATE POLICY "Users can manage their own work sessions" ON public.user_work_sessions FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 5. Functions & Triggers

-- 5.1 handle_task_time_tracking()
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
  -- Only process status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Process for assignee
  affected_user_id := NEW.assignee_id;
  
  -- If no assignee, do nothing
  IF affected_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get existing time tracking entry
  SELECT * INTO current_entry
  FROM task_time_tracking
  WHERE task_id = NEW.id AND user_id = affected_user_id;

  -- Status changed TO "In Progress" - START timer
  IF NEW.status = 'In Progress' THEN
    IF current_entry IS NULL THEN
      -- Create new entry with running timer
      INSERT INTO task_time_tracking (task_id, user_id, is_running, started_at, last_status)
      VALUES (NEW.id, affected_user_id, true, now(), NEW.status);
    ELSE
      -- Resume existing timer
      UPDATE task_time_tracking
      SET is_running = true,
          started_at = now(),
          last_status = NEW.status,
          updated_at = now()
      WHERE id = current_entry.id;
    END IF;

  -- Status changed FROM "In Progress" to something else - PAUSE timer
  ELSIF OLD.status = 'In Progress' AND NEW.status != 'In Progress' THEN
    IF current_entry IS NOT NULL AND current_entry.is_running THEN
      -- Calculate elapsed time
      elapsed_seconds := EXTRACT(EPOCH FROM (now() - current_entry.started_at))::INTEGER;
      
      -- Update with accumulated time and stop
      UPDATE task_time_tracking
      SET is_running = false,
          total_seconds = total_seconds + elapsed_seconds,
          paused_at = now(),
          last_status = NEW.status,
          updated_at = now()
      WHERE id = current_entry.id;
    END IF;

  -- Task set to "On Hold" - ensure timer is paused
  ELSIF NEW.status = 'On Hold' THEN
    IF current_entry IS NOT NULL AND current_entry.is_running THEN
      elapsed_seconds := EXTRACT(EPOCH FROM (now() - current_entry.started_at))::INTEGER;
      
      -- Update with accumulated time and stop
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

-- Trigger for handle_task_time_tracking
DROP TRIGGER IF EXISTS task_time_tracking_trigger ON public.tasks;
CREATE TRIGGER task_time_tracking_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_time_tracking();


-- 5.2 sync_task_timers_with_work_session()
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
  -- Get user's active work session
  SELECT * INTO work_session
  FROM user_work_sessions
  WHERE user_id = _user_id
    AND session_date = CURRENT_DATE
    AND is_active = true
  ORDER BY login_time DESC
  LIMIT 1;

  -- If no active session or session is paused, pause all running task timers
  IF work_session IS NULL OR work_session.is_paused = true THEN
    -- Pause all running timers for this user
    -- Iterate to calculate individually
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

-- 5.3 init_collaborator_time_tracking()
CREATE OR REPLACE FUNCTION public.init_collaborator_time_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create time tracking entry for new collaborator
  INSERT INTO task_time_tracking (task_id, user_id, is_running, total_seconds)
  VALUES (NEW.task_id, NEW.user_id, false, 0)
  ON CONFLICT (task_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger for init_collaborator_time_tracking
DROP TRIGGER IF EXISTS init_collaborator_time_tracking_trigger ON public.task_collaborators;
CREATE TRIGGER init_collaborator_time_tracking_trigger
  AFTER INSERT ON public.task_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.init_collaborator_time_tracking();
