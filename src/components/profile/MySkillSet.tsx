import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface MySkillSetProps {
  skillSet: string[] | null;
}

export function MySkillSet({ skillSet }: MySkillSetProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          My Skill Set
        </CardTitle>
      </CardHeader>
      <CardContent>
        {skillSet && skillSet.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skillSet.map((skill, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-sm px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 transition-colors"
              >
                {skill}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">
            Share your creative skills and talents! ✨
          </p>
        )}
      </CardContent>
    </Card>
  );
}
