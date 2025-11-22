import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Loader2, ArrowLeft } from "lucide-react";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { MyArsenal } from "@/components/profile/MyArsenal";
import { HobbiesSection } from "@/components/profile/HobbiesSection";
import { InspirationBoard } from "@/components/profile/InspirationBoard";
import { CreativeStats } from "@/components/profile/CreativeStats";
import { CollaborationStyle } from "@/components/profile/CollaborationStyle";
import { EditProfileDrawer } from "@/components/profile/EditProfileDrawer";
import { MyCanvas } from "@/components/profile/MyCanvas";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [viewingUserId, setViewingUserId] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<"project_manager" | "project_owner" | "team_member" | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [searchParams]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setCurrentUserId(session.user.id);
    
    // Check if viewing another user's profile
    const userParam = searchParams.get("user");
    const targetUserId = userParam || session.user.id;
    setViewingUserId(targetUserId);
    
    await fetchProfileData(targetUserId);
    setLoading(false);
  };

  const fetchProfileData = async (id: string) => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", id)
      .single();

    if (roleData) {
      setRole(roleData.role);
    }
  };

  const handleProfileUpdate = () => {
    fetchProfileData(viewingUserId);
  };

  const isOwnProfile = currentUserId === viewingUserId;

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const fromTeam = searchParams.get("from") === "team";

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
        {fromTeam && (
          <Button
            variant="ghost"
            onClick={() => navigate("/team")}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back to My Team
          </Button>
        )}
        
        <ProfileHero
          profile={profile}
          role={role}
          onEditClick={isOwnProfile ? () => setEditDrawerOpen(true) : undefined}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MyArsenal
            superpower={profile?.superpower}
            kryptonite={profile?.kryptonite}
          />
          <CreativeStats userId={viewingUserId} />
        </div>

        <HobbiesSection hobbies={profile?.hobbies || []} />

        <CollaborationStyle userId={viewingUserId} />

        <MyCanvas userId={viewingUserId} />

        <InspirationBoard userId={viewingUserId} />

        {isOwnProfile && (
          <EditProfileDrawer
            open={editDrawerOpen}
            onOpenChange={setEditDrawerOpen}
            profile={profile}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
      </div>
    </MainLayout>
  );
}
