import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CollaborationMetricsProps {
  userId: string;
}

export const CollaborationMetrics = ({ userId }: CollaborationMetricsProps) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [userId]);

  const fetchMetrics = async () => {
    const { data } = await supabase
      .from("collaboration_metrics")
      .select("*")
      .eq("user_id", userId)
      .single();

    setMetrics(data);
    setLoading(false);
  };

  if (loading || !metrics) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Collaboration Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-3">Leadership (As Task Owner)</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Tasks with Collaborators</span>
                <span className="font-medium">{metrics.tasks_with_collaborators}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Leadership Score</span>
                <span className="font-medium">{metrics.collaboration_leadership_score.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.collaboration_leadership_score} className="h-2" />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Collaboration (As Collaborator)</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Collaborated Tasks</span>
                <span className="font-medium">{metrics.collaborated_tasks}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Participation Score</span>
                <span className="font-medium">{metrics.collaboration_participation_score.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.collaboration_participation_score} className="h-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
