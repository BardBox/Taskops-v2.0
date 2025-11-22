export type AchievementType = 
  | 'first_task'
  | 'speed_demon'
  | 'early_bird'
  | 'streak_3'
  | 'streak_7'
  | 'fire_streak'
  | 'streak_30'
  | 'multitasker'
  | 'perfectionist'
  | 'perfect_timing'
  | 'night_owl'
  | 'urgent_master'
  | 'urgent_hero'
  | 'task_master'
  | 'team_player'
  | 'client_favorite'
  | 'comeback_kid'
  | 'mentor'
  | 'consistency_king'
  | 'innovation_award'
  | 'weekend_warrior';

export interface Achievement {
  id: AchievementType;
  name: string;
  description: string;
  icon: string;
  points: number;
}

export const ACHIEVEMENTS: Record<AchievementType, Achievement> = {
  first_task: {
    id: 'first_task',
    name: 'Getting Started',
    description: 'Complete your first task',
    icon: '🎯',
    points: 10,
  },
  speed_demon: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a task within 1 hour of assignment',
    icon: '⚡',
    points: 25,
  },
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a task before deadline',
    icon: '🐦',
    points: 15,
  },
  streak_3: {
    id: 'streak_3',
    name: '3-Day Streak',
    description: 'Complete tasks for 3 days in a row',
    icon: '🔥',
    points: 30,
  },
  streak_7: {
    id: 'streak_7',
    name: '7-Day Streak',
    description: 'Complete tasks for 7 days in a row',
    icon: '🔥🔥',
    points: 75,
  },
  fire_streak: {
    id: 'fire_streak',
    name: '7-Day Fire Streak',
    description: 'Maintain a 7-day completion streak',
    icon: '🔥🔥',
    points: 75,
  },
  streak_30: {
    id: 'streak_30',
    name: '30-Day Streak',
    description: 'Complete tasks for 30 days in a row',
    icon: '🔥🔥🔥',
    points: 300,
  },
  multitasker: {
    id: 'multitasker',
    name: 'Multitasker',
    description: 'Complete 5 tasks in one day',
    icon: '🎪',
    points: 50,
  },
  perfectionist: {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete 10 tasks before their deadline',
    icon: '💎',
    points: 100,
  },
  perfect_timing: {
    id: 'perfect_timing',
    name: 'Perfect Timing',
    description: 'Complete 5 tasks on time',
    icon: '⏰',
    points: 50,
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a task after 10 PM',
    icon: '🦉',
    points: 20,
  },
  urgent_master: {
    id: 'urgent_master',
    name: 'Urgent Master',
    description: 'Complete 10 urgent/high priority tasks',
    icon: '👑',
    points: 100,
  },
  urgent_hero: {
    id: 'urgent_hero',
    name: 'Urgent Hero',
    description: 'Complete 10 high-urgency tasks',
    icon: '🦸',
    points: 60,
  },
  task_master: {
    id: 'task_master',
    name: 'Task Master',
    description: 'Complete 50 tasks total',
    icon: '🏆',
    points: 100,
  },
  team_player: {
    id: 'team_player',
    name: 'Team Player',
    description: 'Collaborate on 10 tasks',
    icon: '🤝',
    points: 50,
  },
  client_favorite: {
    id: 'client_favorite',
    name: 'Client Favorite',
    description: 'Earn 5 quality stars from the same client',
    icon: '⭐',
    points: 75,
  },
  comeback_kid: {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Turn around 3 delayed tasks',
    icon: '🎭',
    points: 40,
  },
  mentor: {
    id: 'mentor',
    name: 'Mentor',
    description: 'Help colleagues as collaborator 20 times',
    icon: '🎓',
    points: 80,
  },
  consistency_king: {
    id: 'consistency_king',
    name: 'Consistency King',
    description: 'Maintain 90%+ on-time rate for 3 months',
    icon: '👑',
    points: 150,
  },
  innovation_award: {
    id: 'innovation_award',
    name: 'Innovation Award',
    description: 'Complete complex/unique tasks',
    icon: '💡',
    points: 100,
  },
  weekend_warrior: {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Complete tasks on weekends',
    icon: '⚔️',
    points: 30,
  },
};

export const calculateTaskPoints = (urgency: string, completedBeforeDeadline: boolean, minutesToComplete?: number): number => {
  const urgencyLower = urgency.toLowerCase();
  let basePoints = 3; // Low urgency
  
  if (urgencyLower.includes('high') || urgencyLower.includes('urgent') || urgencyLower.includes('critical')) {
    basePoints = 10;
  } else if (urgencyLower.includes('medium') || urgencyLower.includes('moderate')) {
    basePoints = 5;
  }
  
  let multiplier = 1;
  
  // Bonus for completing before deadline
  if (completedBeforeDeadline) {
    multiplier += 0.5;
  }
  
  // Bonus for completing quickly (within 1 hour)
  if (minutesToComplete && minutesToComplete <= 60) {
    multiplier += 1;
  }
  
  return Math.round(basePoints * multiplier);
};

export const checkAchievements = (stats: {
  totalCompleted: number;
  completedToday: number;
  currentStreak: number;
  completedBeforeDeadline: number;
  urgentCompleted: number;
  lastCompletionTime?: Date;
}): AchievementType[] => {
  const newAchievements: AchievementType[] = [];
  
  if (stats.totalCompleted === 1) {
    newAchievements.push('first_task');
  }
  
  if (stats.completedToday >= 5) {
    newAchievements.push('multitasker');
  }
  
  if (stats.currentStreak >= 30) {
    newAchievements.push('streak_30');
  } else if (stats.currentStreak >= 7) {
    newAchievements.push('streak_7');
  } else if (stats.currentStreak >= 3) {
    newAchievements.push('streak_3');
  }
  
  if (stats.completedBeforeDeadline >= 10) {
    newAchievements.push('perfectionist');
  }
  
  if (stats.urgentCompleted >= 10) {
    newAchievements.push('urgent_master');
  }
  
  if (stats.lastCompletionTime) {
    const hour = stats.lastCompletionTime.getHours();
    if (hour >= 22 || hour < 6) {
      newAchievements.push('night_owl');
    }
  }
  
  return newAchievements;
};
