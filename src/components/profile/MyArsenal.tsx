import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Shield } from "lucide-react";

interface MyArsenalProps {
  superpower?: string | null;
  kryptonite?: string | null;
}

export function MyArsenal({ superpower, kryptonite }: MyArsenalProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          My Arsenal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Superpower */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold text-green-700 dark:text-green-300">My Superpower</h3>
          </div>
          {superpower ? (
            <p className="text-sm text-foreground">{superpower}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              What's your creative strength? 💪
            </p>
          )}
        </div>

        {/* Kryptonite */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
            <h3 className="font-semibold text-red-700 dark:text-red-300">My Kryptonite</h3>
          </div>
          {kryptonite ? (
            <p className="text-sm text-foreground">{kryptonite}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              What challenges you? We all have one! 🤔
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
