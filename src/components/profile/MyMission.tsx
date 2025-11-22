import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

interface MyMissionProps {
  mission: string | null;
}

export function MyMission({ mission }: MyMissionProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          My Mission
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mission ? (
          <p className="text-foreground leading-relaxed">{mission}</p>
        ) : (
          <p className="text-muted-foreground italic">
            Share your learning goals and aspirations! 🎯
          </p>
        )}
      </CardContent>
    </Card>
  );
}
