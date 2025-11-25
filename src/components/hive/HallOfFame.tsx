import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trophy, Plus, Award } from "lucide-react";
import { format } from "date-fns";

interface HallOfFameEntry {
  id: string;
  month_year: string;
  achievement_title: string;
  description: string;
  created_at: string;
  user_profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  nominator_profile: {
    full_name: string;
  };
}

const HallOfFame = () => {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [achievementTitle, setAchievementTitle] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const currentMonthYear = format(new Date(), "yyyy-MM");

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: hallOfFame = [] } = useQuery({
    queryKey: ["hallOfFame"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hall_of_fame")
        .select(`
          *,
          user_profile:profiles!user_id (
            id,
            full_name,
            avatar_url
          ),
          nominator_profile:profiles!nominated_by (
            full_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as HallOfFameEntry[];
    },
  });

  const nominateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("hall_of_fame").insert({
        user_id: selectedUserId,
        month_year: currentMonthYear,
        achievement_title: achievementTitle,
        description,
        nominated_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hallOfFame"] });
      toast.success("Nomination submitted successfully!");
      setSelectedUserId("");
      setAchievementTitle("");
      setDescription("");
      setOpen(false);
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("This user already has a nomination for this month");
      } else {
        toast.error("Failed to submit nomination");
      }
    },
  });

  const currentMonthEntry = hallOfFame.find(entry => entry.month_year === currentMonthYear);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <CardTitle>Hall of Fame</CardTitle>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Nominate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nominate Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Achievement title"
                  value={achievementTitle}
                  onChange={(e) => setAchievementTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Why do they deserve this recognition?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={() => nominateMutation.mutate()}
                  disabled={!selectedUserId || !achievementTitle || !description}
                  className="w-full"
                >
                  Submit Nomination
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {currentMonthEntry && currentMonthEntry.user_profile && (
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg p-6 border-2 border-primary">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-16 h-16 ring-2 ring-primary">
                  <AvatarImage src={currentMonthEntry.user_profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {currentMonthEntry.user_profile.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg text-foreground">
                      {format(new Date(), "MMMM yyyy")}
                    </h3>
                  </div>
                  <p className="font-semibold text-foreground">
                    {currentMonthEntry.user_profile.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentMonthEntry.achievement_title}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                "{currentMonthEntry.description}"
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Nominated by {currentMonthEntry.nominator_profile.full_name}
              </p>
            </div>
          )}

          {hallOfFame.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No nominations yet. Be the first to recognize someone!
            </p>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Previous Winners</h4>
              {hallOfFame.filter(entry => entry.id !== currentMonthEntry?.id && entry.user_profile).map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                  <Avatar>
                    <AvatarImage src={entry.user_profile.avatar_url || undefined} />
                    <AvatarFallback>{entry.user_profile.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {entry.user_profile.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.achievement_title}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.month_year), "MMM yy")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HallOfFame;
