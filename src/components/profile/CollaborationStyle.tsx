import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users } from "lucide-react";

interface CollaborationStyleProps {
  userId: string;
}

export function CollaborationStyle({ userId }: CollaborationStyleProps) {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetchMetrics();
  }, [userId]);

  const fetchMetrics = async () => {
    const { data } = await supabase
      .from("collaboration_metrics")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      setMetrics(data);
    }
  };

  if (!metrics) return null;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Collaboration Style
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Leadership Score</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(metrics.collaboration_leadership_score || 0)}%
            </span>
          </div>
          <Progress value={metrics.collaboration_leadership_score || 0} className="h-2" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Participation Score</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(metrics.collaboration_participation_score || 0)}%
            </span>
          </div>
          <Progress value={metrics.collaboration_participation_score || 0} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-2xl font-bold text-primary">
              {metrics.tasks_with_collaborators || 0}
            </p>
            <p className="text-xs text-muted-foreground">Tasks Led</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary">
              {metrics.collaborated_tasks || 0}
            </p>
            <p className="text-xs text-muted-foreground">Collaborations</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
