import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  birth_month: number | null;
  birth_day: number | null;
}

const BirthdayWall = () => {
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  const { data: birthdays = [] } = useQuery({
    queryKey: ["birthdays", currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, birth_month, birth_day")
        .eq("birth_month", currentMonth)
        .not("birth_day", "is", null)
        .order("birth_day", { ascending: true });
      
      if (error) throw error;
      return data as Profile[];
    },
  });

  const triggerBirthdayConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98'],
    });
  };

  const isToday = (day: number | null) => day === currentDay;

  const getDaysUntil = (day: number) => {
    if (day === currentDay) return 0;
    if (day > currentDay) return day - currentDay;
    return -1;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cake className="w-5 h-5 text-primary" />
          <CardTitle>Birthday Wall</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {birthdays.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No birthdays this month
            </p>
          ) : (
            birthdays.map((person) => {
              const isBirthdayToday = isToday(person.birth_day);
              const daysUntil = getDaysUntil(person.birth_day || 0);

              return (
                <div
                  key={person.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isBirthdayToday
                      ? "bg-gradient-to-r from-primary/20 to-accent/20 border-2 border-primary animate-pulse"
                      : "bg-accent/30"
                  }`}
                  onClick={isBirthdayToday ? triggerBirthdayConfetti : undefined}
                >
                  <Avatar className={isBirthdayToday ? "ring-2 ring-primary" : ""}>
                    <AvatarImage src={person.avatar_url || undefined} />
                    <AvatarFallback>{person.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground flex items-center gap-2">
                      {person.full_name}
                      {isBirthdayToday && <Sparkles className="w-4 h-4 text-primary" />}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isBirthdayToday
                        ? "🎉 Today!"
                        : daysUntil > 0
                        ? `In ${daysUntil} day${daysUntil > 1 ? "s" : ""}`
                        : `Day ${person.birth_day}`}
                    </p>
                  </div>
                  {isBirthdayToday && (
                    <Cake className="w-6 h-6 text-primary animate-bounce" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BirthdayWall;
