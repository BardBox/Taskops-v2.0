-- Create user_achievements table to track unlocked achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  points_earned INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- Create gamification_stats table for comprehensive user stats
CREATE TABLE IF NOT EXISTS public.gamification_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completion_date DATE,
  total_completed INTEGER NOT NULL DEFAULT 0,
  completed_today INTEGER NOT NULL DEFAULT 0,
  completed_before_deadline INTEGER NOT NULL DEFAULT 0,
  urgent_completed INTEGER NOT NULL DEFAULT 0,
  quality_stars_received INTEGER NOT NULL DEFAULT 0,
  collaboration_count INTEGER NOT NULL DEFAULT 0,
  speed_completion_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create performance_metrics table for advanced analytics
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  tasks_on_time INTEGER DEFAULT 0,
  tasks_delayed INTEGER DEFAULT 0,
  avg_completion_time_hours NUMERIC(10,2),
  quality_score NUMERIC(5,2),
  collaboration_score NUMERIC(5,2),
  speed_score NUMERIC(5,2),
  urgency_score NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "PM/PO can view all achievements"
  ON public.user_achievements FOR SELECT
  USING (has_role(auth.uid(), 'project_manager'::app_role) OR has_role(auth.uid(), 'project_owner'::app_role));

-- RLS Policies for gamification_stats
CREATE POLICY "Users can view their own stats"
  ON public.gamification_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.gamification_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert stats"
  ON public.gamification_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "PM/PO can view all stats"
  ON public.gamification_stats FOR SELECT
  USING (has_role(auth.uid(), 'project_manager'::app_role) OR has_role(auth.uid(), 'project_owner'::app_role));

-- RLS Policies for performance_metrics
CREATE POLICY "Users can view their own metrics"
  ON public.performance_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert metrics"
  ON public.performance_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "PM/PO can view all metrics"
  ON public.performance_metrics FOR SELECT
  USING (has_role(auth.uid(), 'project_manager'::app_role) OR has_role(auth.uid(), 'project_owner'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_gamification_stats_user_id ON public.gamification_stats(user_id);
CREATE INDEX idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_date ON public.performance_metrics(metric_date);

-- Create function to update gamification stats
CREATE OR REPLACE FUNCTION update_gamification_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_gamification_stats_updated_at
  BEFORE UPDATE ON public.gamification_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_stats_updated_at();