import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ACHIEVEMENTS, calculateTaskPoints, checkAchievements, AchievementType } from '@/utils/achievements';
import { triggerConfetti, triggerAchievementConfetti } from '@/utils/celebrationEffects';
import { playNotificationSound } from '@/utils/notificationSounds';

interface GamificationStats {
  points: number;
  totalCompleted: number;
  completedToday: number;
  currentStreak: number;
  completedBeforeDeadline: number;
  urgentCompleted: number;
  achievements: AchievementType[];
  lastCompletionDate?: string;
}

export const useGamification = (userId: string | undefined) => {
  const { toast } = useToast();
  const [stats, setStats] = useState<GamificationStats>({
    points: 0,
    totalCompleted: 0,
    completedToday: 0,
    currentStreak: 0,
    completedBeforeDeadline: 0,
    urgentCompleted: 0,
    achievements: [],
  });

  // Load stats from localStorage on mount
  useEffect(() => {
    if (!userId) return;
    
    const savedStats = localStorage.getItem(`gamification_${userId}`);
    if (savedStats) {
      const parsed = JSON.parse(savedStats);
      setStats(parsed);
      
      // Check if we need to reset daily stats
      const today = new Date().toDateString();
      if (parsed.lastCompletionDate !== today) {
        setStats(prev => ({ ...prev, completedToday: 0 }));
      }
    }
  }, [userId]);

  // Save stats to localStorage whenever they change
  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(`gamification_${userId}`, JSON.stringify(stats));
  }, [stats, userId]);

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

  const onTaskCompleted = useCallback((task: {
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
    
    const today = new Date().toDateString();
    const isNewDay = stats.lastCompletionDate !== today;
    
    setStats(prev => {
      const newStats: GamificationStats = {
        points: prev.points + points,
        totalCompleted: prev.totalCompleted + 1,
        completedToday: isNewDay ? 1 : prev.completedToday + 1,
        currentStreak: isNewDay ? prev.currentStreak + 1 : prev.currentStreak,
        completedBeforeDeadline: completedBeforeDeadline ? prev.completedBeforeDeadline + 1 : prev.completedBeforeDeadline,
        urgentCompleted: isUrgent ? prev.urgentCompleted + 1 : prev.urgentCompleted,
        achievements: prev.achievements,
        lastCompletionDate: today,
      };
      
      // Check for new achievements
      const potentialAchievements = checkAchievements({
        ...newStats,
        lastCompletionTime: now,
      });
      
      const newAchievements = potentialAchievements.filter(
        achievementId => !prev.achievements.includes(achievementId)
      );
      
      if (newAchievements.length > 0) {
        newStats.achievements = [...prev.achievements, ...newAchievements];
        newAchievements.forEach(achievementId => {
          showAchievementToast(achievementId);
          newStats.points += ACHIEVEMENTS[achievementId].points;
        });
      }
      
      // Check for speed demon achievement
      if (minutesToComplete <= 60 && !prev.achievements.includes('speed_demon')) {
        if (!newStats.achievements.includes('speed_demon')) {
          newStats.achievements.push('speed_demon');
          showAchievementToast('speed_demon');
          newStats.points += ACHIEVEMENTS['speed_demon'].points;
        }
      }
      
      // Check for early bird achievement
      if (completedBeforeDeadline && !prev.achievements.includes('early_bird')) {
        if (!newStats.achievements.includes('early_bird')) {
          newStats.achievements.push('early_bird');
          showAchievementToast('early_bird');
          newStats.points += ACHIEVEMENTS['early_bird'].points;
        }
      }
      
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
  }, [stats.lastCompletionDate, toast, showAchievementToast]);

  return {
    stats,
    onTaskCompleted,
  };
};
