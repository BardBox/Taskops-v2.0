import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Trophy, Medal, Award, Zap, Star, Users, Flame, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar: string | null;
  score: number;
  rank: number;
  totalTasks?: number;
  completedTasks?: number;
  qualityStars?: number;
  streak?: number;
  collaborations?: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [speedLeaderboard, setSpeedLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [qualityLeaderboard, setQualityLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [collaborationLeaderboard, setCollaborationLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [streakLeaderboard, setStreakLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    checkAuthAndFetchLeaderboards();
  }, []);

  const checkAuthAndFetchLeaderboards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setCurrentUserId(user.id);
    await fetchLeaderboards();
  };

  const fetchLeaderboards = async () => {
    try {
      // Fetch all users with their profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url');

      if (profilesError) throw profilesError;

      // Fetch gamification stats
      const { data: gamificationStats, error: gamificationError } = await supabase
        .from('gamification_stats')
        .select('*');

      if (gamificationError) throw gamificationError;

      // Fetch all tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*');

      if (tasksError) throw tasksError;

      // Fetch quality stars
      const { data: stars, error: starsError } = await supabase
        .from('task_appreciations')
        .select('task_id');

      if (starsError) throw starsError;

      // Fetch collaborations
      const { data: collaborations, error: collabError } = await supabase
        .from('task_collaborators')
        .select('user_id');

      if (collabError) throw collabError;

      // Build leaderboards
      const userDataMap = new Map();

      profiles?.forEach(profile => {
        const userTasks = tasks?.filter(t => t.assignee_id === profile.id) || [];
        const completedTasks = userTasks.filter(t => t.status === 'Approved');
        const onTimeTasks = completedTasks.filter(t => 
          t.actual_delivery && t.deadline && new Date(t.actual_delivery) <= new Date(t.deadline)
        );
        
        const userStars = stars?.filter(s => {
          const task = tasks?.find(t => t.id === s.task_id);
          return task?.assignee_id === profile.id;
        }) || [];

        const userCollabs = collaborations?.filter(c => c.user_id === profile.id) || [];
        
        const gamificationData = gamificationStats?.find(g => g.user_id === profile.id);

        userDataMap.set(profile.id, {
          userId: profile.id,
          userName: profile.full_name,
          userAvatar: profile.avatar_url,
          totalTasks: userTasks.length,
          completedTasks: completedTasks.length,
          onTimeTasks: onTimeTasks.length,
          qualityStars: userStars.length,
          collaborations: userCollabs.length,
          totalPoints: gamificationData?.total_points || 0,
          currentStreak: gamificationData?.current_streak || 0,
        });
      });

      // Overall Leaderboard (by total points)
      const overall = Array.from(userDataMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((entry, index) => ({
          ...entry,
          score: entry.totalPoints,
          rank: index + 1,
        }));

      setOverallLeaderboard(overall);

      // Speed Champions (by on-time completion rate)
      const speed = Array.from(userDataMap.values())
        .filter(entry => entry.completedTasks > 0)
        .map(entry => ({
          ...entry,
          score: Math.round((entry.onTimeTasks / entry.completedTasks) * 100),
        }))
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      setSpeedLeaderboard(speed);

      // Quality Masters (by quality stars)
      const quality = Array.from(userDataMap.values())
        .sort((a, b) => b.qualityStars - a.qualityStars)
        .map((entry, index) => ({
          ...entry,
          score: entry.qualityStars,
          rank: index + 1,
        }));

      setQualityLeaderboard(quality);

      // Collaboration Heroes (by collaboration count)
      const collaboration = Array.from(userDataMap.values())
        .sort((a, b) => b.collaborations - a.collaborations)
        .map((entry, index) => ({
          ...entry,
          score: entry.collaborations,
          rank: index + 1,
        }));

      setCollaborationLeaderboard(collaboration);

      // Streak Kings (by current streak)
      const streak = Array.from(userDataMap.values())
        .sort((a, b) => b.currentStreak - a.currentStreak)
        .map((entry, index) => ({
          ...entry,
          score: entry.currentStreak,
          streak: entry.currentStreak,
          rank: index + 1,
        }));

      setStreakLeaderboard(streak);

    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
  };

  const LeaderboardCard = ({ 
    entries, 
    scoreLabel, 
    icon: Icon, 
    iconColor 
  }: { 
    entries: LeaderboardEntry[]; 
    scoreLabel: string; 
    icon: any; 
    iconColor: string;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          {scoreLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.slice(0, 10).map((entry) => (
            <div 
              key={entry.userId}
              onClick={() => navigate(`/analytics/personal?userId=${entry.userId}&userName=${entry.userName}`)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                entry.userId === currentUserId 
                  ? 'bg-primary/10 border-2 border-primary hover:bg-primary/15' 
                  : 'bg-muted/50 hover:bg-muted hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-center w-8">
                {getRankIcon(entry.rank)}
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={entry.userAvatar || undefined} />
                <AvatarFallback>{entry.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{entry.userName}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.totalTasks} tasks • {entry.completedTasks} completed
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{entry.score}</p>
                <p className="text-xs text-muted-foreground">{scoreLabel.toLowerCase()}</p>
              </div>
              {entry.userId === currentUserId && (
                <Badge variant="default" className="ml-2">You</Badge>
              )}
            </div>
          ))}
          {entries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Icon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No data available yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Breadcrumbs />
          <div className="mt-4">
            <h1 className="text-3xl font-bold tracking-tight">Leaderboards</h1>
            <p className="text-muted-foreground">See how you rank against your team</p>
          </div>
        </div>

        <Tabs defaultValue="overall" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overall">Overall</TabsTrigger>
            <TabsTrigger value="speed">Speed</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
            <TabsTrigger value="streak">Streak</TabsTrigger>
          </TabsList>

          <TabsContent value="overall" className="mt-6">
            <LeaderboardCard 
              entries={overallLeaderboard}
              scoreLabel="Points"
              icon={Trophy}
              iconColor="text-yellow-500"
            />
          </TabsContent>

          <TabsContent value="speed" className="mt-6">
            <LeaderboardCard 
              entries={speedLeaderboard}
              scoreLabel="On-Time %"
              icon={Zap}
              iconColor="text-blue-500"
            />
          </TabsContent>

          <TabsContent value="quality" className="mt-6">
            <LeaderboardCard 
              entries={qualityLeaderboard}
              scoreLabel="Quality Stars"
              icon={Star}
              iconColor="text-yellow-500"
            />
          </TabsContent>

          <TabsContent value="collaboration" className="mt-6">
            <LeaderboardCard 
              entries={collaborationLeaderboard}
              scoreLabel="Collaborations"
              icon={Users}
              iconColor="text-green-500"
            />
          </TabsContent>

          <TabsContent value="streak" className="mt-6">
            <LeaderboardCard 
              entries={streakLeaderboard}
              scoreLabel="Day Streak"
              icon={Flame}
              iconColor="text-orange-500"
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Leaderboard;