import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AvatarSelector } from "@/components/AvatarSelector";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Separator } from "@/components/ui/separator";

const AccountSettings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Custom avatar generation
  const [customAvatarPrompt, setCustomAvatarPrompt] = useState("");
  const [generatingCustom, setGeneratingCustom] = useState(false);
  const [avatarRefreshTrigger, setAvatarRefreshTrigger] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    setEmail(session.user.email || "");
    await fetchProfile(session.user.id);
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
    } else if (data) {
      setFullName((data as any).full_name || "");
      setAvatarUrl((data as any).avatar_url || "");
    }
  };

  // Detect category from prompt keywords
  const detectCategory = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('dragon') || lowerPrompt.includes('elf') || lowerPrompt.includes('wizard') || 
        lowerPrompt.includes('fairy') || lowerPrompt.includes('fantasy') || lowerPrompt.includes('mythical')) {
      return 'fantasy';
    }
    if (lowerPrompt.includes('cat') || lowerPrompt.includes('dog') || lowerPrompt.includes('bird') || 
        lowerPrompt.includes('lion') || lowerPrompt.includes('animal') || lowerPrompt.includes('wolf') ||
        lowerPrompt.includes('panda') || lowerPrompt.includes('fox') || lowerPrompt.includes('bear') ||
        lowerPrompt.includes('tiger') || lowerPrompt.includes('elephant') || lowerPrompt.includes('bull')) {
      return 'animal';
    }
    if (lowerPrompt.includes('abstract') || lowerPrompt.includes('geometric') || lowerPrompt.includes('pattern') ||
        lowerPrompt.includes('colorful') || lowerPrompt.includes('artistic')) {
      return 'abstract';
    }
    if (lowerPrompt.includes('robot') || lowerPrompt.includes('droid') || lowerPrompt.includes('cyborg') ||
        lowerPrompt.includes('android') || lowerPrompt.includes('machine')) {
      return 'droid';
    }
    if (lowerPrompt.includes('hero') || lowerPrompt.includes('superhero') || lowerPrompt.includes('super hero')) {
      return 'superhero';
    }
    if (lowerPrompt.includes('villain') || lowerPrompt.includes('supervillain') || lowerPrompt.includes('super villain')) {
      return 'supervillain';
    }
    if (lowerPrompt.includes('nature') || lowerPrompt.includes('landscape') || lowerPrompt.includes('mountain') ||
        lowerPrompt.includes('ocean') || lowerPrompt.includes('forest') || lowerPrompt.includes('tree')) {
      return 'nature';
    }
    return 'human';
  };

  // Generate a smart name from the prompt
  const generateSmartName = (prompt: string): string => {
    // Extract key nouns/adjectives from the prompt
    const words = prompt.toLowerCase()
      .replace(/[^a-z\s]/g, '') // Remove special chars
      .split(/\s+/)
      .filter(w => w.length > 3) // Filter short words
      .slice(0, 3); // Take first 3 meaningful words
    
    if (words.length === 0) return "Avatar";
    
    // Capitalize first letter of each word
    return words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const handleGenerateCustomAvatar = async () => {
    if (!user) return;
    
    if (!customAvatarPrompt.trim()) {
      toast.error("Please describe your avatar");
      return;
    }

    setGeneratingCustom(true);

    try {
      const fullPrompt = `${customAvatarPrompt}, high quality avatar portrait, professional digital art`;
      const detectedCategory = detectCategory(customAvatarPrompt);
      const smartName = generateSmartName(customAvatarPrompt);
      
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          prompt: fullPrompt, 
          name: smartName, 
          category: detectedCategory 
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        // Convert base64 to blob
        const base64Response = await fetch(data.imageUrl);
        const blob = await base64Response.blob();
        
        // Upload to storage with user-specific path
        const fileName = `custom_${user.id}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        // Save to default_avatars table - twice (custom + detected category)
        
        // Save with "custom" category
        await supabase.from('default_avatars').insert({
          name: smartName,
          image_url: publicUrl,
          category: 'custom'
        });

        // Save with detected category
        await supabase.from('default_avatars').insert({
          name: smartName,
          image_url: publicUrl,
          category: detectedCategory
        });

        // Update avatar URL
        setAvatarUrl(publicUrl);
        setCustomAvatarPrompt("");
        setAvatarRefreshTrigger(prev => prev + 1); // Trigger avatar list refresh
        toast.success("Custom avatar generated and saved for everyone to use!");
      }
    } catch (error: any) {
      console.error('Error generating custom avatar:', error);
      toast.error(error.message || 'Failed to generate avatar');
    } finally {
      setGeneratingCustom(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName, avatar_url: avatarUrl } as any)
        .eq("id", user.id);

      if (profileError) throw profileError;

      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        });

        if (emailError) throw emailError;
        toast.success("Profile updated. Please check your email to confirm the new address.");
      } else {
        toast.success("Profile updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Breadcrumbs />
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and profile
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information and avatar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || ""} alt={fullName} />
                <AvatarFallback>{fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">Profile Avatar</p>
                <p className="text-xs text-muted-foreground">
                  Choose from our library or create your own custom avatar
                </p>
              </div>
            </div>

            <AvatarSelector
              selectedAvatarUrl={avatarUrl}
              onAvatarSelect={(url) => setAvatarUrl(url)}
              refreshTrigger={avatarRefreshTrigger}
            />

            <Separator />

            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Create Custom Avatar</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Describe your ideal avatar in a word or sentence, and AI will generate it for you
                </p>
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={customAvatarPrompt}
                  onChange={(e) => setCustomAvatarPrompt(e.target.value)}
                  placeholder="e.g., 'friendly person with curly hair and glasses'"
                  disabled={generatingCustom}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !generatingCustom) {
                      handleGenerateCustomAvatar();
                    }
                  }}
                />
                <Button 
                  onClick={handleGenerateCustomAvatar}
                  disabled={generatingCustom || !customAvatarPrompt.trim()}
                  className="shrink-0"
                >
                  {generatingCustom ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Examples: "cheerful person with red hair", "professional in suit", "creative artist with colorful style"
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
              <p className="text-xs text-muted-foreground">
                Changing your email will require verification
              </p>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleChangePassword} 
              disabled={changingPassword || !newPassword || !confirmPassword}
              className="w-full"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;
