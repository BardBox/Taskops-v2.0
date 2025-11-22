import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ACHIEVEMENTS, calculateTaskPoints, AchievementType } from '@/utils/achievements';
import { triggerConfetti, triggerAchievementConfetti } from '@/utils/celebrationEffects';
import { playNotificationSound } from '@/utils/notificationSounds';

interface EnhancedGamificationStats {
  totalPoints: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  completedToday: number;
  completedBeforeDeadline: number;
  urgentCompleted: number;
  qualityStarsReceived: number;
  collaborationCount: number;
  speedCompletionCount: number;
  achievements: AchievementType[];
  lastCompletionDate?: string;
}

export const useEnhancedGamification = (userId: string | undefined) => {
  const { toast } = useToast();
  const [stats, setStats] = useState<EnhancedGamificationStats>({
    totalPoints: 0,
    currentLevel: 1,
    currentStreak: 0,
    longestStreak: 0,
    totalCompleted: 0,
    completedToday: 0,
    completedBeforeDeadline: 0,
    urgentCompleted: 0,
    qualityStarsReceived: 0,
    collaborationCount: 0,
    speedCompletionCount: 0,
    achievements: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch stats from database
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    const fetchStats = async () => {
      try {
        // Fetch gamification stats
        const { data: gamificationData, error: gamificationError } = await supabase
          .from('gamification_stats')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (gamificationError && gamificationError.code !== 'PGRST116') {
          throw gamificationError;
        }

        // Fetch achievements
        const { data: achievementsData, error: achievementsError } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', userId);

        if (achievementsError) {
          throw achievementsError;
        }

        if (gamificationData) {
          setStats({
            totalPoints: gamificationData.total_points || 0,
            currentLevel: gamificationData.current_level || 1,
            currentStreak: gamificationData.current_streak || 0,
            longestStreak: gamificationData.longest_streak || 0,
            totalCompleted: gamificationData.total_completed || 0,
            completedToday: gamificationData.completed_today || 0,
            completedBeforeDeadline: gamificationData.completed_before_deadline || 0,
            urgentCompleted: gamificationData.urgent_completed || 0,
            qualityStarsReceived: gamificationData.quality_stars_received || 0,
            collaborationCount: gamificationData.collaboration_count || 0,
            speedCompletionCount: gamificationData.speed_completion_count || 0,
            achievements: achievementsData?.map(a => a.achievement_id as AchievementType) || [],
            lastCompletionDate: gamificationData.last_completion_date || undefined,
          });
        }
      } catch (error) {
        console.error('Error fetching gamification stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  const calculateLevel = (points: number): number => {
    if (points < 500) return Math.floor(points / 100) + 1; // Bronze (1-5)
    if (points < 1500) return Math.floor((points - 500) / 200) + 6; // Silver (6-10)
    if (points < 3500) return Math.floor((points - 1500) / 400) + 11; // Gold (11-15)
    if (points < 7500) return Math.floor((points - 3500) / 800) + 16; // Platinum (16-20)
    return Math.floor((points - 7500) / 1500) + 21; // Diamond (21+)
  };

  const showAchievementToast = useCallback((achievementId: AchievementType) => {
    const achievement = ACHIEVEMENTS[achievementId];
    toast({
      title: `${achievement.icon} Achievement Unlocked!`,
      description: `${achievement.name} - ${achievement.description} (+${achievement.points} points)`,
      duration: 5000,
    });
    playNotificationSound('chime', 0.8);
    triggerAchievementConfetti();
  }, [toast]);

  const syncToDatabase = useCallback(async (newStats: EnhancedGamificationStats) => {
    if (!userId) return;

    try {
      // Upsert gamification stats
      const { error: statsError } = await supabase
        .from('gamification_stats')
        .upsert({
          user_id: userId,
          total_points: newStats.totalPoints,
          current_level: newStats.currentLevel,
          current_streak: newStats.currentStreak,
          longest_streak: newStats.longestStreak,
          last_completion_date: newStats.lastCompletionDate,
          total_completed: newStats.totalCompleted,
          completed_today: newStats.completedToday,
          completed_before_deadline: newStats.completedBeforeDeadline,
          urgent_completed: newStats.urgentCompleted,
          quality_stars_received: newStats.qualityStarsReceived,
          collaboration_count: newStats.collaborationCount,
          speed_completion_count: newStats.speedCompletionCount,
        });

      if (statsError) throw statsError;
    } catch (error) {
      console.error('Error syncing gamification stats:', error);
    }
  }, [userId]);

  const unlockAchievement = useCallback(async (achievementId: AchievementType) => {
    if (!userId) return;

    try {
      const achievement = ACHIEVEMENTS[achievementId];
      
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievementId,
          points_earned: achievement.points,
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error;
      }
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  }, [userId]);

  const onTaskCompleted = useCallback(async (task: {
    urgency: string;
    deadline?: string | null;
    created_at: string;
  }) => {
    const now = new Date();
    const createdAt = new Date(task.created_at);
    const minutesToComplete = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    
    const completedBeforeDeadline = task.deadline 
      ? new Date(task.deadline) > now 
      : false;
    
    const points = calculateTaskPoints(task.urgency, completedBeforeDeadline, minutesToComplete);
    
    const urgencyLower = task.urgency.toLowerCase();
    const isUrgent = urgencyLower.includes('high') || urgencyLower.includes('urgent') || urgencyLower.includes('critical');
    const isSpeedCompletion = minutesToComplete <= 60;
    
    const today = new Date().toDateString();
    const isNewDay = stats.lastCompletionDate !== today;
    
    setStats(prev => {
      const newTotalPoints = prev.totalPoints + points;
      const newLevel = calculateLevel(newTotalPoints);
      
      const newStats: EnhancedGamificationStats = {
        totalPoints: newTotalPoints,
        currentLevel: newLevel,
        totalCompleted: prev.totalCompleted + 1,
        completedToday: isNewDay ? 1 : prev.completedToday + 1,
        currentStreak: isNewDay ? prev.currentStreak + 1 : prev.currentStreak,
        longestStreak: isNewDay 
          ? Math.max(prev.longestStreak, prev.currentStreak + 1) 
          : prev.longestStreak,
        completedBeforeDeadline: completedBeforeDeadline ? prev.completedBeforeDeadline + 1 : prev.completedBeforeDeadline,
        urgentCompleted: isUrgent ? prev.urgentCompleted + 1 : prev.urgentCompleted,
        qualityStarsReceived: prev.qualityStarsReceived,
        collaborationCount: prev.collaborationCount,
        speedCompletionCount: isSpeedCompletion ? prev.speedCompletionCount + 1 : prev.speedCompletionCount,
        achievements: prev.achievements,
        lastCompletionDate: today,
      };

      // Level up notification
      if (newLevel > prev.currentLevel) {
        toast({
          title: '🎊 Level Up!',
          description: `You've reached Level ${newLevel}!`,
          duration: 5000,
        });
        triggerAchievementConfetti();
      }
      
      // Sync to database
      syncToDatabase(newStats);
      
      return newStats;
    });
    
    // Trigger confetti
    triggerConfetti(task.urgency);
    
    // Show points toast
    toast({
      title: '🎉 Task Completed!',
      description: `+${points} points earned`,
      duration: 3000,
    });
    
    // Play success sound
    playNotificationSound('chime', 0.7);
  }, [stats.lastCompletionDate, toast, syncToDatabase]);

  return {
    stats,
    loading,
    onTaskCompleted,
  };
};