import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarSelector } from "@/components/AvatarSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>
                <AvatarSelector
                  selectedAvatarUrl={avatarUrl}
                  onAvatarSelect={(url) => setAvatarUrl(url)}
                />
              </div>

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
    </Drawer>
  );
}
