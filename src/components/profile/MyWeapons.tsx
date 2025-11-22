import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

interface MyWeaponsProps {
  weapons: string[] | null;
}

export function MyWeapons({ weapons }: MyWeaponsProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          My Weapons
        </CardTitle>
      </CardHeader>
      <CardContent>
        {weapons && weapons.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {weapons.map((weapon, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-sm px-3 py-1.5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 transition-colors"
              >
                {weapon}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">
            Share the tools and platforms you use! 🛠️
          </p>
        )}
      </CardContent>
    </Card>
  );
}
