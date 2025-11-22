import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";

interface HobbiesSectionProps {
  hobbies: string[];
}

export function HobbiesSection({ hobbies }: HobbiesSectionProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          When I'm Not Creating
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hobbies && hobbies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {hobbies.map((hobby, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-sm px-3 py-1.5 bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 transition-colors"
              >
                {hobby}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">
            Share your hobbies and interests outside of work! 🎨🎮🎵
          </p>
        )}
      </CardContent>
    </Card>
  );
}
