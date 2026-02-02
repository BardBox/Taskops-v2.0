import { useState, useEffect, useRef } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarSelector } from "@/components/AvatarSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, X, Camera, Sparkles, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImageCropper } from "@/components/ImageCropper";

interface EditProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  onProfileUpdate: () => void;
}

export function EditProfileDrawer({
  open,
  onOpenChange,
  profile,
  onProfileUpdate,
}: EditProfileDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [creativeTitle, setCreativeTitle] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [superpower, setSuperpower] = useState("");
  const [kryptonite, setKryptonite] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [newHobby, setNewHobby] = useState("");
  const [weapons, setWeapons] = useState<string[]>([]);
  const [newWeapon, setNewWeapon] = useState("");
  const [skillSet, setSkillSet] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [mission, setMission] = useState("");
  const [status, setStatus] = useState("Available");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [customAvatarPrompt, setCustomAvatarPrompt] = useState("");
  const [generatingCustom, setGeneratingCustom] = useState(false);
  const [avatarRefreshTrigger, setAvatarRefreshTrigger] = useState(0);

  // Image Cropper State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setCreativeTitle(profile.creative_title || "");
      setAvatarUrl(profile.avatar_url || "");
      setTagline(profile.tagline || "");
      setSuperpower(profile.superpower || "");
      setKryptonite(profile.kryptonite || "");
      setHobbies(profile.hobbies || []);
      setWeapons(profile.weapons || []);
      setSkillSet(profile.skill_set || []);
      setMission(profile.mission || "");
      setStatus(profile.status || "Available");
    }

    // Fetch email
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email || "");
      }
    });
  }, [profile]);

  const handleSaveProfile = async () => {
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        creative_title: creativeTitle || null,
        avatar_url: avatarUrl,
        tagline: tagline || null,
        superpower: superpower || null,
        kryptonite: kryptonite || null,
        hobbies: hobbies.length > 0 ? hobbies : null,
        weapons: weapons.length > 0 ? weapons : null,
        skill_set: skillSet.length > 0 ? skillSet : null,
        mission: mission || null,
        status: status,
      })
      .eq("id", profile.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update profile");
      return;
    }

    toast.success("Profile updated!");
    onProfileUpdate();
    onOpenChange(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to change password");
      return;
    }

    toast.success("Password changed successfully");
    setNewPassword("");
    setConfirmPassword("");
  };

  const addHobby = () => {
    if (newHobby.trim() && hobbies.length < 7) {
      setHobbies([...hobbies, newHobby.trim()]);
      setNewHobby("");
    }
  };

  const removeHobby = (index: number) => {
    setHobbies(hobbies.filter((_, i) => i !== index));
  };

  const addWeapon = () => {
    if (newWeapon.trim() && weapons.length < 10) {
      setWeapons([...weapons, newWeapon.trim()]);
      setNewWeapon("");
    }
  };

  const removeWeapon = (index: number) => {
    setWeapons(weapons.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    if (newSkill.trim() && skillSet.length < 10) {
      setSkillSet([...skillSet, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (index: number) => {
    setSkillSet(skillSet.filter((_, i) => i !== index));
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

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

  const generateSmartName = (prompt: string): string => {
    const words = prompt.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 3);

    if (words.length === 0) return "Avatar";

    return words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const handleGenerateCustomAvatar = async () => {
    if (!customAvatarPrompt.trim()) {
      toast.error("Please describe your avatar");
      return;
    }

    setGeneratingCustom(true);

    try {
      const fullPrompt = `${customAvatarPrompt}, high quality avatar portrait, professional digital art`;
      const detectedCategory = detectCategory(customAvatarPrompt);
      const firstName = fullName.split(' ')[0] || 'User';

      let smartName = generateSmartName(customAvatarPrompt);
      try {
        const { data: nameData, error: nameError } = await supabase.functions.invoke('generate-avatar-name', {
          body: { prompt: customAvatarPrompt }
        });

        if (!nameError && nameData?.name) {
          smartName = nameData.name;
        }
      } catch (nameErr) {
        console.warn("Failed to generate AI name, using fallback:", nameErr);
      }

      const finalName = `${smartName} - ${firstName}`;

      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: {
          prompt: fullPrompt,
          name: finalName,
          category: detectedCategory
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const base64Response = await fetch(data.imageUrl);
        const blob = await base64Response.blob();

        const fileName = `custom_${profile.id}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: blob.type,
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        await supabase.from('default_avatars').insert({
          name: smartName,
          image_url: publicUrl,
          category: 'custom'
        });

        // Also add to mapped category for better discovery
        await supabase.from('default_avatars').insert({
          name: smartName,
          image_url: publicUrl,
          category: detectedCategory
        });

        setAvatarUrl(publicUrl);
        setCustomAvatarPrompt("");
        setAvatarRefreshTrigger(prev => prev + 1);
        toast.success("Custom avatar generated and saved!");
      }
    } catch (error: any) {
      console.error('Error generating custom avatar:', error);
      toast.error(error.message || 'Failed to generate avatar');
    } finally {
      setGeneratingCustom(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || null);
        setCropperOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      const fileName = `upload_${profile.id}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add to default_avatars as 'custom' so it appears in the list
      await supabase.from('default_avatars').insert({
        name: 'Custom Upload',
        image_url: publicUrl,
        category: 'custom'
      });

      setAvatarUrl(publicUrl);
      setAvatarRefreshTrigger(prev => prev + 1);
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Upload error", error);
      toast.error("Failed to upload avatar");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Edit Profile</DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="about">About Me</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 mt-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex gap-2">
                  <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Camera className="h-4 w-4" />
                        Change Avatar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Choose Your Avatar</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col items-center gap-2 py-4 border-b mb-4">
                        {/* Upload Section */}
                        <div className="flex gap-2 mb-4">
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Button
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Upload & Crop Image
                          </Button>
                        </div>

                        <p className="text-sm text-muted-foreground">Selected Avatar</p>
                        <Avatar className="w-20 h-20">
                          <AvatarImage src={avatarUrl || undefined} />
                          <AvatarFallback className="text-2xl">
                            {getInitials(fullName)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <AvatarSelector
                        selectedAvatarUrl={avatarUrl}
                        onAvatarSelect={(url) => {
                          setAvatarUrl(url);
                          setAvatarDialogOpen(false);
                        }}
                        refreshTrigger={avatarRefreshTrigger}
                      />

                      <div className="mt-4 space-y-3 border-t pt-4">
                        <Label htmlFor="customPrompt" className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Create Custom Avatar with AI
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="customPrompt"
                            value={customAvatarPrompt}
                            onChange={(e) => setCustomAvatarPrompt(e.target.value)}
                            placeholder="Describe your avatar (e.g., 'a cosmic astronaut cat')"
                            disabled={generatingCustom}
                          />
                          <Button
                            onClick={handleGenerateCustomAvatar}
                            disabled={generatingCustom || !customAvatarPrompt.trim()}
                            className="gap-2"
                          >
                            {generatingCustom ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                            Generate
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          AI will generate a unique avatar based on your description and add it to the gallery above
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Profile Fields */}
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="creativeTitle">Creative Title</Label>
                <Input
                  id="creativeTitle"
                  value={creativeTitle}
                  onChange={(e) => setCreativeTitle(e.target.value)}
                  placeholder="e.g., Senior Designer, Creative Director"
                  maxLength={50}
                  list="creative-title-suggestions"
                />
                <datalist id="creative-title-suggestions">
                  <option value="Visual Designer" />
                  <option value="Motion Designer" />
                  <option value="UX/UI Designer" />
                  <option value="Graphic Designer" />
                  <option value="Brand Designer" />
                  <option value="Creative Director" />
                  <option value="Art Director" />
                  <option value="Senior Designer" />
                  <option value="Junior Designer" />
                  <option value="Design Lead" />
                  <option value="Copywriter" />
                  <option value="Content Creator" />
                  <option value="Illustrator" />
                  <option value="Animator" />
                  <option value="Video Editor" />
                </datalist>
                <p className="text-xs text-muted-foreground mt-1">
                  Your organizational position or creative specialty (optional)
                </p>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled />
              </div>

              <div>
                <Label htmlFor="tagline">Creative Tagline</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Your creative motto or vibe..."
                  maxLength={100}
                />
              </div>
            </TabsContent>

            <TabsContent value="about" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="status">Availability Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Busy">Busy</SelectItem>
                    <SelectItem value="Out of Office">Out of Office</SelectItem>
                    <SelectItem value="Do Not Disturb">Do Not Disturb</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="superpower">My Superpower 💪</Label>
                <Textarea
                  id="superpower"
                  value={superpower}
                  onChange={(e) => setSuperpower(e.target.value)}
                  placeholder="What's your creative strength?"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="kryptonite">My Kryptonite 🤔</Label>
                <Textarea
                  id="kryptonite"
                  value={kryptonite}
                  onChange={(e) => setKryptonite(e.target.value)}
                  placeholder="What challenges you?"
                  rows={3}
                />
              </div>

              <div>
                <Label>My Weapons (Max 10)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newWeapon}
                    onChange={(e) => setNewWeapon(e.target.value)}
                    placeholder="e.g., Figma, React, Photoshop..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addWeapon();
                      }
                    }}
                    disabled={weapons.length >= 10}
                  />
                  <Button
                    onClick={addWeapon}
                    size="icon"
                    disabled={weapons.length >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {weapons.map((weapon, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {weapon}
                      <button
                        onClick={() => removeWeapon(index)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>My Skill Set (Max 10)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="e.g., 3D Animation, Leadership..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    disabled={skillSet.length >= 10}
                  />
                  <Button
                    onClick={addSkill}
                    size="icon"
                    disabled={skillSet.length >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {skillSet.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(index)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="mission">My Mission 🎯</Label>
                <Textarea
                  id="mission"
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  placeholder="What are your learning goals and aspirations?"
                  rows={3}
                />
              </div>

              <div>
                <Label>My Hobbies (Max 7)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newHobby}
                    onChange={(e) => setNewHobby(e.target.value)}
                    placeholder="Add a hobby..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addHobby();
                      }
                    }}
                    disabled={hobbies.length >= 7}
                  />
                  <Button
                    onClick={addHobby}
                    size="icon"
                    disabled={hobbies.length >= 7}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {hobbies.map((hobby, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {hobby}
                      <button
                        onClick={() => removeHobby(index)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DrawerContent>

      <ImageCropper
        imageSrc={imageSrc}
        open={cropperOpen}
        onClose={() => setCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </Drawer>
  );
}
