import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Loader2 } from "lucide-react";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { MyArsenal } from "@/components/profile/MyArsenal";
import { HobbiesSection } from "@/components/profile/HobbiesSection";
import { InspirationBoard } from "@/components/profile/InspirationBoard";
import { CreativeStats } from "@/components/profile/CreativeStats";
import { CollaborationStyle } from "@/components/profile/CollaborationStyle";
import { EditProfileDrawer } from "@/components/profile/EditProfileDrawer";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<"project_manager" | "project_owner" | "team_member" | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);
    await fetchProfileData(session.user.id);
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
    fetchProfileData(userId);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
        <ProfileHero
          profile={profile}
          role={role}
          onEditClick={() => setEditDrawerOpen(true)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MyArsenal
            superpower={profile?.superpower}
            kryptonite={profile?.kryptonite}
          />
          <CreativeStats userId={userId} />
        </div>

        <HobbiesSection hobbies={profile?.hobbies || []} />

        <CollaborationStyle userId={userId} />

        <InspirationBoard userId={userId} />

        <EditProfileDrawer
          open={editDrawerOpen}
          onOpenChange={setEditDrawerOpen}
          profile={profile}
          onProfileUpdate={handleProfileUpdate}
        />
      </div>
    </MainLayout>
  );
}
