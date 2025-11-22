-- Function to update gamification stats when task is completed
CREATE OR REPLACE FUNCTION update_gamification_on_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_points integer := 0;
  v_new_level integer;
  v_is_speed_completion boolean := false;
  v_is_on_time boolean := false;
  v_is_urgent boolean := false;
  v_completion_time_minutes integer;
  v_current_streak integer;
  v_today date := CURRENT_DATE;
  v_last_completion_date date;
  v_existing_stats record;
BEGIN
  -- Only process when task status changes TO "Approved"
  IF NEW.status != 'Approved' OR OLD.status = 'Approved' THEN
    RETURN NEW;
  END IF;

  -- Calculate completion time in minutes
  v_completion_time_minutes := EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 60;
  
  -- Check if it's a speed completion (under 1 hour)
  v_is_speed_completion := v_completion_time_minutes <= 60;
  
  -- Check if completed on time
  IF NEW.deadline IS NOT NULL THEN
    v_is_on_time := NOW() <= NEW.deadline;
  END IF;
  
  -- Check if urgent task
  v_is_urgent := NEW.urgency IN ('High', 'Critical', 'Urgent');
  
  -- Calculate points
  -- Base points by urgency
  v_points := CASE 
    WHEN NEW.urgency = 'Low' THEN 3
    WHEN NEW.urgency IN ('Mid', 'Medium') THEN 5
    WHEN NEW.urgency IN ('High', 'Critical', 'Urgent') THEN 10
    ELSE 5
  END;
  
  -- Multipliers
  IF v_is_on_time THEN
    v_points := v_points * 1.5; -- 50% bonus for on-time completion
  END IF;
  
  IF v_is_speed_completion THEN
    v_points := v_points * 2; -- 2x for speed completion
  END IF;
  
  -- Round points
  v_points := ROUND(v_points);
  
  -- Get existing stats
  SELECT * INTO v_existing_stats
  FROM gamification_stats
  WHERE user_id = NEW.assignee_id;
  
  -- Calculate streak
  IF v_existing_stats IS NOT NULL THEN
    v_last_completion_date := v_existing_stats.last_completion_date;
    
    IF v_last_completion_date IS NULL THEN
      v_current_streak := 1;
    ELSIF v_last_completion_date = v_today THEN
      -- Same day, keep current streak
      v_current_streak := v_existing_stats.current_streak;
    ELSIF v_last_completion_date = v_today - INTERVAL '1 day' THEN
      -- Consecutive day, increment streak
      v_current_streak := v_existing_stats.current_streak + 1;
    ELSE
      -- Streak broken, reset to 1
      v_current_streak := 1;
    END IF;
  ELSE
    v_current_streak := 1;
  END IF;
  
  -- Calculate new level based on total points
  -- Bronze (1-5): 0-500, Silver (6-10): 500-1500, Gold (11-15): 1500-3500, 
  -- Platinum (16-20): 3500-7500, Diamond (21+): 7500+
  DECLARE
    v_new_total_points integer := COALESCE(v_existing_stats.total_points, 0) + v_points;
  BEGIN
    IF v_new_total_points < 500 THEN
      v_new_level := FLOOR(v_new_total_points / 100.0) + 1; -- Bronze (1-5)
    ELSIF v_new_total_points < 1500 THEN
      v_new_level := FLOOR((v_new_total_points - 500) / 200.0) + 6; -- Silver (6-10)
    ELSIF v_new_total_points < 3500 THEN
      v_new_level := FLOOR((v_new_total_points - 1500) / 400.0) + 11; -- Gold (11-15)
    ELSIF v_new_total_points < 7500 THEN
      v_new_level := FLOOR((v_new_total_points - 3500) / 800.0) + 16; -- Platinum (16-20)
    ELSE
      v_new_level := FLOOR((v_new_total_points - 7500) / 1500.0) + 21; -- Diamond (21+)
    END IF;
  END;
  
  -- Upsert gamification stats
  INSERT INTO gamification_stats (
    user_id,
    total_points,
    current_level,
    current_streak,
    longest_streak,
    total_completed,
    completed_today,
    completed_before_deadline,
    urgent_completed,
    speed_completion_count,
    last_completion_date
  ) VALUES (
    NEW.assignee_id,
    v_points,
    v_new_level,
    v_current_streak,
    v_current_streak,
    1,
    1,
    CASE WHEN v_is_on_time THEN 1 ELSE 0 END,
    CASE WHEN v_is_urgent THEN 1 ELSE 0 END,
    CASE WHEN v_is_speed_completion THEN 1 ELSE 0 END,
    v_today
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = gamification_stats.total_points + v_points,
    current_level = v_new_level,
    current_streak = v_current_streak,
    longest_streak = GREATEST(gamification_stats.longest_streak, v_current_streak),
    total_completed = gamification_stats.total_completed + 1,
    completed_today = CASE 
      WHEN gamification_stats.last_completion_date = v_today THEN gamification_stats.completed_today + 1
      ELSE 1
    END,
    completed_before_deadline = gamification_stats.completed_before_deadline + CASE WHEN v_is_on_time THEN 1 ELSE 0 END,
    urgent_completed = gamification_stats.urgent_completed + CASE WHEN v_is_urgent THEN 1 ELSE 0 END,
    speed_completion_count = gamification_stats.speed_completion_count + CASE WHEN v_is_speed_completion THEN 1 ELSE 0 END,
    last_completion_date = v_today,
    updated_at = NOW();
    
  -- Check and unlock achievements
  DECLARE
    v_stats record;
  BEGIN
    SELECT * INTO v_stats FROM gamification_stats WHERE user_id = NEW.assignee_id;
    
    -- First Task achievement
    IF v_stats.total_completed = 1 THEN
      INSERT INTO user_achievements (user_id, achievement_id, points_earned)
      VALUES (NEW.assignee_id, 'first_task', 10)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Speed Demon achievement (complete task in under 1 hour)
    IF v_is_speed_completion THEN
      INSERT INTO user_achievements (user_id, achievement_id, points_earned)
      VALUES (NEW.assignee_id, 'speed_demon', 25)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Perfect Timing achievement (5 on-time completions)
    IF v_stats.completed_before_deadline >= 5 THEN
      INSERT INTO user_achievements (user_id, achievement_id, points_earned)
      VALUES (NEW.assignee_id, 'perfect_timing', 50)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Task Master achievement (50 tasks completed)
    IF v_stats.total_completed >= 50 THEN
      INSERT INTO user_achievements (user_id, achievement_id, points_earned)
      VALUES (NEW.assignee_id, 'task_master', 100)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Fire Streak achievement (7 day streak)
    IF v_stats.current_streak >= 7 THEN
      INSERT INTO user_achievements (user_id, achievement_id, points_earned)
      VALUES (NEW.assignee_id, 'fire_streak', 75)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Urgent Hero achievement (10 urgent tasks)
    IF v_stats.urgent_completed >= 10 THEN
      INSERT INTO user_achievements (user_id, achievement_id, points_earned)
      VALUES (NEW.assignee_id, 'urgent_hero', 60)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END;
  
  RETURN NEW;
END;
$$;

-- Create trigger for task completion
DROP TRIGGER IF EXISTS trigger_update_gamification_on_task_completion ON tasks;
CREATE TRIGGER trigger_update_gamification_on_task_completion
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_on_task_completion();

-- Add unique constraint to user_achievements to prevent duplicates
ALTER TABLE user_achievements DROP CONSTRAINT IF EXISTS user_achievements_user_id_achievement_id_key;
ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id);