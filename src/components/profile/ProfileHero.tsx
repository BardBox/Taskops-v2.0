import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/RoleBadge";
import { Edit, Sparkles } from "lucide-react";

interface ProfileHeroProps {
  profile: any;
  role: "project_manager" | "project_owner" | "team_member" | null;
  onEditClick?: () => void;
}

export function ProfileHero({ profile, role, onEditClick }: ProfileHeroProps) {
  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      
      <div className="relative p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
            <AvatarImage 
              src={profile?.avatar_url || undefined} 
              alt={profile?.full_name}
              className="object-cover"
            />
            <AvatarFallback className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
              {getInitials(profile?.full_name || "")}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {profile?.full_name}
              </h1>
              
              {/* Creative Title, Role Badge, Status & Mood Row */}
              <div className="flex flex-wrap items-center gap-3">
                {profile?.creative_title && (
                  <span className="text-lg font-medium text-primary">
                    {profile.creative_title}
                  </span>
                )}
                <RoleBadge role={role} />
                {profile?.status && (
                  <Badge 
                    variant="outline" 
                    className={`${
                      profile.status === "Available" ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" :
                      profile.status === "Busy" ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" :
                      profile.status === "Out of Office" ? "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" :
                      profile.status === "Do Not Disturb" ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" :
                      profile.status === "On Leave" ? "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20" :
                      "bg-muted"
                    }`}
                  >
                    {profile.status}
                  </Badge>
                )}
                {profile?.mood && (
                  <Badge variant="outline" className="text-sm">
                    Feeling {profile.mood.split(" ")[1] || profile.mood} {profile.mood.split(" ")[0]}
                  </Badge>
                )}
              </div>
            </div>

            {profile?.tagline && (
              <p className="text-lg text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {profile.tagline}
              </p>
            )}

            {!profile?.tagline && (
              <p className="text-muted-foreground italic">
                Add a creative tagline to showcase your artistic vibe
              </p>
            )}
          </div>

          {/* Edit Button */}
          {onEditClick && (
            <Button
              onClick={onEditClick}
              variant="outline"
              size="lg"
              className="gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
