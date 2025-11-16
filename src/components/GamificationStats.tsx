import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Star, TrendingUp } from 'lucide-react';

interface GamificationStatsProps {
  points: number;
  currentStreak: number;
  completedToday: number;
  achievements: string[];
}

export const GamificationStats = ({ 
  points, 
  currentStreak, 
  completedToday,
  achievements 
}: GamificationStatsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Points</p>
            <p className="text-2xl font-bold text-amber-600">{points}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-red-600/10 border-orange-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Flame className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Streak</p>
            <p className="text-2xl font-bold text-orange-600">{currentStreak} 🔥</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-2xl font-bold text-blue-600">{completedToday}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Star className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Badges</p>
            <p className="text-2xl font-bold text-purple-600">{achievements.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
