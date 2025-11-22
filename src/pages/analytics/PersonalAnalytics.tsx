import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TrendingUp, Target, Zap, Award, Users, Clock, CheckCircle2, Trophy, Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useEnhancedGamification } from "@/hooks/useEnhancedGamification";
import { ACHIEVEMENTS } from "@/utils/achievements";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";

interface PersonalStats {
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  avgCompletionTime: number;
  qualityScore: number;
  speedScore: number;
  urgencyScore: number;
  collaborationScore: number;
  teamAvgCompletion: number;
  teamAvgOnTime: number;
  percentileRank: number;
  strengths: string[];
  improvements: string[];
}

const PersonalAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [stats, setStats] = useState<PersonalStats>({
    totalTasks: 0,
    completedTasks: 0,
    onTimeTasks: 0,
    avgCompletionTime: 0,
    qualityScore: 0,
    speedScore: 0,
    urgencyScore: 0,
    collaborationScore: 0,
    teamAvgCompletion: 0,
    teamAvgOnTime: 0,
    percentileRank: 0,
    strengths: [],
    improvements: [],
  });
  const [radarData, setRadarData] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any[]>([]);
  const { stats: gamificationStats, loading: gamificationLoading } = useEnhancedGamification(userId);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchPersonalStats();
    }
  }, [dateFrom, dateTo, userId]);

  const checkAuthAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setUserId(user.id);
    await fetchPersonalStats(user.id);
  };

  const fetchPersonalStats = async (uid?: string) => {
    const targetUserId = uid || userId;
    if (!targetUserId) return;
    
    try {
      // Build query with optional date filters
      let tasksQuery = supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', targetUserId);
      
      if (dateFrom) {
        tasksQuery = tasksQuery.gte('date', dateFrom.toISOString().split('T')[0]);
      }
      if (dateTo) {
        tasksQuery = tasksQuery.lte('date', dateTo.toISOString().split('T')[0]);
      }
      
      const { data: userTasks, error: userTasksError } = await tasksQuery;

      if (userTasksError) throw userTasksError;

      // Fetch all team members' tasks for comparison
      const { data: allTasks, error: allTasksError } = await supabase
        .from('tasks')
        .select('*');

      if (allTasksError) throw allTasksError;

      // Fetch quality stars
      const { data: stars, error: starsError } = await supabase
        .from('task_appreciations')
        .select('*')
        .eq('task_id', uid);

      if (starsError) throw starsError;

      // Fetch collaboration data
      const { data: collaborations, error: collabError } = await supabase
        .from('task_collaborators')
        .select('*')
        .eq('user_id', uid);

      if (collabError) throw collabError;

      // Calculate user stats
      const completedTasks = userTasks?.filter(t => t.status === 'Approved').length || 0;
      const onTimeTasks = userTasks?.filter(t => 
        t.status === 'Approved' && 
        t.actual_delivery && 
        t.deadline && 
        new Date(t.actual_delivery) <= new Date(t.deadline)
      ).length || 0;

      // Calculate team averages
      const teamMembers = new Set(allTasks?.map(t => t.assignee_id));
      const teamCompletionRates = Array.from(teamMembers).map(memberId => {
        const memberTasks = allTasks?.filter(t => t.assignee_id === memberId);
        const memberCompleted = memberTasks?.filter(t => t.status === 'Approved').length || 0;
        return memberTasks && memberTasks.length > 0 ? (memberCompleted / memberTasks.length) * 100 : 0;
      });

      const teamAvgCompletion = teamCompletionRates.reduce((a, b) => a + b, 0) / teamCompletionRates.length || 0;
      
      const userCompletionRate = userTasks && userTasks.length > 0 ? (completedTasks / userTasks.length) * 100 : 0;
      const userOnTimeRate = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;

      // Calculate scores
      const qualityScore = Math.min((stars?.length || 0) * 10, 100);
      const speedScore = userOnTimeRate;
      const urgencyScore = Math.min(((userTasks?.filter(t => 
        t.urgency.toLowerCase().includes('high') || 
        t.urgency.toLowerCase().includes('urgent')
      ).length || 0) / (userTasks?.length || 1)) * 100, 100);
      const collaborationScore = Math.min((collaborations?.length || 0) * 5, 100);

      // Calculate percentile rank
      const userScore = userCompletionRate;
      const betterThanCount = teamCompletionRates.filter(rate => userScore > rate).length;
      const percentileRank = (betterThanCount / teamCompletionRates.length) * 100;

      // Identify strengths and improvements
      const strengths = [];
      const improvements = [];

      if (speedScore >= 80) strengths.push("On-time delivery");
      else if (speedScore < 60) improvements.push("On-time delivery");

      if (qualityScore >= 80) strengths.push("Quality work");
      else if (qualityScore < 60) improvements.push("Quality consistency");

      if (urgencyScore >= 70) strengths.push("High-urgency tasks");
      else if (urgencyScore < 50) improvements.push("Urgent task handling");

      if (collaborationScore >= 70) strengths.push("Team collaboration");
      else if (collaborationScore < 50) improvements.push("Collaboration leadership");

      setStats({
        totalTasks: userTasks?.length || 0,
        completedTasks,
        onTimeTasks,
        avgCompletionTime: 0, // Can be calculated if needed
        qualityScore,
        speedScore,
        urgencyScore,
        collaborationScore,
        teamAvgCompletion,
        teamAvgOnTime: 0, // Can be calculated if needed
        percentileRank,
        strengths,
        improvements,
      });

      // Set radar data
      setRadarData([
        { subject: 'Speed', user: speedScore, teamAvg: teamAvgCompletion },
        { subject: 'Quality', user: qualityScore, teamAvg: 70 },
        { subject: 'Consistency', user: userCompletionRate, teamAvg: teamAvgCompletion },
        { subject: 'Collaboration', user: collaborationScore, teamAvg: 60 },
        { subject: 'Urgency', user: urgencyScore, teamAvg: 65 },
      ]);

      // Set progress timeline data (last 6 months)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const progressData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

        const monthTasks = userTasks?.filter(t => 
          t.created_at >= monthStart && t.created_at <= monthEnd
        );
        const monthCompleted = monthTasks?.filter(t => t.status === 'Approved').length || 0;

        progressData.push({
          month: monthNames[date.getMonth()],
          completed: monthCompleted,
          total: monthTasks?.length || 0,
        });
      }

      setProgressData(progressData);
    } catch (error) {
      console.error('Error fetching personal analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelTier = (level: number) => {
    if (level <= 5) return { name: "Bronze", color: "text-amber-600" };
    if (level <= 10) return { name: "Silver", color: "text-gray-400" };
    if (level <= 15) return { name: "Gold", color: "text-yellow-500" };
    if (level <= 20) return { name: "Platinum", color: "text-blue-400" };
    return { name: "Diamond", color: "text-cyan-400" };
  };

  const getNextLevelPoints = (level: number) => {
    if (level < 5) return (level + 1) * 100;
    if (level < 10) return 500 + ((level - 5) + 1) * 200;
    if (level < 15) return 1500 + ((level - 10) + 1) * 400;
    if (level < 20) return 3500 + ((level - 15) + 1) * 800;
    return 7500 + ((level - 20) + 1) * 1500;
  };

  if (loading || gamificationLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-60" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  const levelTier = getLevelTier(gamificationStats.currentLevel);
  const nextLevelPoints = getNextLevelPoints(gamificationStats.currentLevel);
  const pointsToNextLevel = nextLevelPoints - gamificationStats.totalPoints;
  const levelProgress = ((gamificationStats.totalPoints % nextLevelPoints) / nextLevelPoints) * 100;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Breadcrumbs />
          <div className="mt-4 space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Performance Dashboard</h1>
              <p className="text-muted-foreground">Track your progress and improve your skills</p>
            </div>
            <TimeRangeFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </div>
        </div>

        {/* Gamification Panel */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className={levelTier.color} />
                Level & Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">Level {gamificationStats.currentLevel}</span>
                  <Badge variant="outline" className={levelTier.color}>{levelTier.name}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{gamificationStats.totalPoints.toLocaleString()} total points</p>
                <Progress value={levelProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {pointsToNextLevel} points to Level {gamificationStats.currentLevel + 1}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Flame className="text-orange-500" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-3xl font-bold">{gamificationStats.currentStreak} days</div>
                <p className="text-sm text-muted-foreground">
                  Best: {gamificationStats.longestStreak} days
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {gamificationStats.currentStreak >= 3 && <Badge variant="outline" className="bg-orange-500/10">🔥 On Fire!</Badge>}
                  {gamificationStats.currentStreak >= 7 && <Badge variant="outline" className="bg-red-500/10">🔥🔥 Unstoppable!</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="text-yellow-500" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-3xl font-bold">{gamificationStats.achievements.length}</div>
                <p className="text-sm text-muted-foreground">
                  of {Object.keys(ACHIEVEMENTS).length} unlocked
                </p>
                <Progress 
                  value={(gamificationStats.achievements.length / Object.keys(ACHIEVEMENTS).length) * 100} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="text-green-500" />
                Tasks Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-3xl font-bold">{gamificationStats.totalCompleted}</div>
                <p className="text-sm text-muted-foreground">
                  {gamificationStats.completedToday} today
                </p>
                <p className="text-xs text-muted-foreground">
                  {gamificationStats.completedBeforeDeadline} before deadline
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Radar Chart */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Performance Radar</CardTitle>
              <CardDescription>Multi-dimensional performance view</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  user: { label: "You", color: "hsl(var(--primary))" },
                  teamAvg: { label: "Team Average", color: "hsl(var(--muted-foreground))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="You" dataKey="user" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                    <Radar name="Team Avg" dataKey="teamAvg" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress Timeline</CardTitle>
              <CardDescription>6-month performance journey</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  completed: { label: "Completed", color: "hsl(var(--chart-2))" },
                  total: { label: "Total", color: "hsl(var(--chart-1))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="completed" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="total" fill="hsl(var(--chart-1))" opacity={0.3} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Organizational Context */}
        <Card>
          <CardHeader>
            <CardTitle>How You Compare</CardTitle>
            <CardDescription>Your standing within the team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Percentile Rank</span>
                  <Badge variant="default">Top {(100 - stats.percentileRank).toFixed(0)}%</Badge>
                </div>
                <Progress value={stats.percentileRank} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  You're performing better than {stats.percentileRank.toFixed(0)}% of the team
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Your Strengths</span>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {stats.strengths.map((strength, i) => (
                    <Badge key={i} variant="outline" className="bg-green-500/10 text-green-600">
                      {strength}
                    </Badge>
                  ))}
                  {stats.strengths.length === 0 && (
                    <p className="text-xs text-muted-foreground">Keep working to identify your strengths!</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Growth Opportunities</span>
                  <Target className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {stats.improvements.map((improvement, i) => (
                    <Badge key={i} variant="outline" className="bg-orange-500/10 text-orange-600">
                      {improvement}
                    </Badge>
                  ))}
                  {stats.improvements.length === 0 && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600">
                      Excellent performance! 🎉
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actionable Insights */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Actionable Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pointsToNextLevel < 100 && (
                <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                  <Trophy className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Almost there!</p>
                    <p className="text-sm text-muted-foreground">
                      You're just {pointsToNextLevel} points away from leveling up to Level {gamificationStats.currentLevel + 1}!
                    </p>
                  </div>
                </div>
              )}
              
              {gamificationStats.currentStreak > 0 && gamificationStats.currentStreak < 3 && (
                <div className="flex items-start gap-3 p-3 bg-orange-500/5 rounded-lg">
                  <Flame className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Build your streak!</p>
                    <p className="text-sm text-muted-foreground">
                      Maintain your streak for {3 - gamificationStats.currentStreak} more days to unlock the 🔥 3-Day Streak achievement!
                    </p>
                  </div>
                </div>
              )}

              {stats.completedTasks > 0 && (
                <div className="flex items-start gap-3 p-3 bg-green-500/5 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Keep up the momentum!</p>
                    <p className="text-sm text-muted-foreground">
                      You've completed {stats.completedTasks} tasks with {((stats.onTimeTasks / stats.completedTasks) * 100).toFixed(0)}% on-time delivery rate.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Achievement Showcase
              </span>
              <Badge variant="outline" onClick={() => navigate('/analytics/achievements')} className="cursor-pointer">
                View All
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {gamificationStats.achievements.slice(0, 6).map((achievementId) => {
                const achievement = ACHIEVEMENTS[achievementId];
                return (
                  <div 
                    key={achievementId}
                    className="flex flex-col items-center p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="text-3xl mb-2">{achievement.icon}</div>
                    <p className="text-xs font-medium text-center">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground text-center">{achievement.points} pts</p>
                  </div>
                );
              })}
              {gamificationStats.achievements.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Complete tasks to unlock achievements!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PersonalAnalytics;