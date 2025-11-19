import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, Monitor, Moon, Sun, Volume2, VolumeX, MonitorCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { Slider } from "@/components/ui/slider";
import { testSound } from "@/utils/notificationSounds";
import { 
  requestNotificationPermission, 
  isNotificationSupported, 
  getNotificationPermission 
} from "@/utils/browserNotifications";
import { MainLayout } from "@/components/MainLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface UserPreferences {
  dashboard_view: string;
  show_metrics: boolean;
  show_filters: boolean;
  notifications_email: boolean;
  notifications_in_app: boolean;
  notifications_task_assigned: boolean;
  notifications_task_completed: boolean;
  notifications_task_updated: boolean;
  notifications_task_approved: boolean;
  notifications_task_reopened: boolean;
  notifications_sound_enabled: boolean;
  notifications_sound_volume: number;
  notifications_sound_type: string;
  theme: string;
}

const Preferences = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission>(
    getNotificationPermission()
  );
  const [preferences, setPreferences] = useState<UserPreferences>({
    dashboard_view: "comfortable",
    show_metrics: true,
    show_filters: true,
    notifications_email: true,
    notifications_in_app: true,
    notifications_task_assigned: true,
    notifications_task_completed: true,
    notifications_task_updated: true,
    notifications_task_approved: true,
    notifications_task_reopened: true,
    notifications_sound_enabled: true,
    notifications_sound_volume: 0.7,
    notifications_sound_type: "default",
    theme: "system",
  });
  
  const [customColors, setCustomColors] = useState({
    primary: "#232c37",
    secondary: "#ffdd00",
    accent: "#d4b47e",
  });

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
    await fetchPreferences(session.user.id);
    setLoading(false);
  };

  const fetchPreferences = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_preferences" as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching preferences:", error);
    } else if (data) {
      setPreferences(data as any);
      // Sync theme with context
      if ((data as any).theme) {
        setTheme((data as any).theme as "light" | "dark" | "system");
      }
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleRequestNotificationPermission = async () => {
    const permission = await requestNotificationPermission();
    setBrowserNotificationPermission(permission);
    
    if (permission === "granted") {
      toast.success("Browser notifications enabled");
    } else {
      toast.error("Permission denied - Enable in browser settings");
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("user_preferences" as any)
        .upsert({
          user_id: user.id,
          ...preferences,
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;

      // Update theme
      setTheme(preferences.theme as "light" | "dark" | "system");

      toast.success("Preferences saved successfully");
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast.error(error.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs />
        
        <div className="max-w-2xl mx-auto space-y-6">
        {/* Dashboard View */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard View</CardTitle>
            <CardDescription>
              Customize how your dashboard is displayed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>View Density</Label>
              <RadioGroup
                value={preferences.dashboard_view}
                onValueChange={(value) => updatePreference("dashboard_view", value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="comfortable" id="comfortable" />
                  <Label htmlFor="comfortable" className="font-normal cursor-pointer">
                    Comfortable - More spacing and larger elements
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compact" id="compact" />
                  <Label htmlFor="compact" className="font-normal cursor-pointer">
                    Compact - Fit more content on screen
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Metrics</Label>
                <p className="text-sm text-muted-foreground">
                  Display dashboard metrics cards
                </p>
              </div>
              <Switch
                checked={preferences.show_metrics}
                onCheckedChange={(checked) => updatePreference("show_metrics", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Filters</Label>
                <p className="text-sm text-muted-foreground">
                  Display filter options above tasks
                </p>
              </div>
              <Switch
                checked={preferences.show_filters}
                onCheckedChange={(checked) => updatePreference("show_filters", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={preferences.notifications_email}
                onCheckedChange={(checked) => updatePreference("notifications_email", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications within the app
                </p>
              </div>
              <Switch
                checked={preferences.notifications_in_app}
                onCheckedChange={(checked) => updatePreference("notifications_in_app", checked)}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base">Notify me when:</Label>

              <div className="flex items-center justify-between pl-4">
                <Label className="font-normal">I'm assigned a task</Label>
                <Switch
                  checked={preferences.notifications_task_assigned}
                  onCheckedChange={(checked) => updatePreference("notifications_task_assigned", checked)}
                />
              </div>

              <div className="flex items-center justify-between pl-4">
                <Label className="font-normal">A task is completed</Label>
                <Switch
                  checked={preferences.notifications_task_completed}
                  onCheckedChange={(checked) => updatePreference("notifications_task_completed", checked)}
                />
              </div>

              <div className="flex items-center justify-between pl-4">
                <Label className="font-normal">A task is updated</Label>
                <Switch
                  checked={preferences.notifications_task_updated}
                  onCheckedChange={(checked) => updatePreference("notifications_task_updated", checked)}
                />
              </div>

              <div className="flex items-center justify-between pl-4">
                <Label className="font-normal">A task is approved</Label>
                <Switch
                  checked={preferences.notifications_task_approved}
                  onCheckedChange={(checked) => updatePreference("notifications_task_approved", checked)}
                />
              </div>

              <div className="flex items-center justify-between pl-4">
                <Label className="font-normal">A task is re-opened</Label>
                <Switch
                  checked={preferences.notifications_task_reopened}
                  onCheckedChange={(checked) => updatePreference("notifications_task_reopened", checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    {preferences.notifications_sound_enabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                    Sound Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Play sounds when notifications arrive
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications_sound_enabled}
                  onCheckedChange={(checked) => updatePreference("notifications_sound_enabled", checked)}
                />
              </div>

              {preferences.notifications_sound_enabled && (
                <>
                  <div className="space-y-3 pl-4">
                    <div className="space-y-2">
                      <Label>Sound Type</Label>
                      <RadioGroup
                        value={preferences.notifications_sound_type}
                        onValueChange={(value) => {
                          updatePreference("notifications_sound_type", value);
                          testSound(value as any, preferences.notifications_sound_volume);
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="default" id="sound-default" />
                          <Label htmlFor="sound-default" className="font-normal cursor-pointer">
                            Default - Simple beep
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="chime" id="sound-chime" />
                          <Label htmlFor="sound-chime" className="font-normal cursor-pointer">
                            Chime - Pleasant musical tone
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="bell" id="sound-bell" />
                          <Label htmlFor="sound-bell" className="font-normal cursor-pointer">
                            Bell - Bell-like ring
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pop" id="sound-pop" />
                          <Label htmlFor="sound-pop" className="font-normal cursor-pointer">
                            Pop - Quick pop sound
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Volume</Label>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(preferences.notifications_sound_volume * 100)}%
                        </span>
                      </div>
                      <Slider
                        value={[preferences.notifications_sound_volume * 100]}
                        onValueChange={(value) => updatePreference("notifications_sound_volume", value[0] / 100)}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testSound(
                          preferences.notifications_sound_type as any,
                          preferences.notifications_sound_volume
                        )}
                        className="w-full"
                      >
                        Test Sound
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Browser Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorCheck className="h-5 w-5" />
              Browser Notifications
            </CardTitle>
            <CardDescription>
              Enable desktop notifications that appear even when this tab is not active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Browser Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  {!isNotificationSupported() && "Not supported in this browser"}
                  {isNotificationSupported() && browserNotificationPermission === "granted" && "Enabled"}
                  {isNotificationSupported() && browserNotificationPermission === "denied" && "Denied - Enable in browser settings"}
                  {isNotificationSupported() && browserNotificationPermission === "default" && "Click to enable"}
                </p>
              </div>
              {isNotificationSupported() && browserNotificationPermission !== "granted" && (
                <Button 
                  onClick={handleRequestNotificationPermission}
                  variant="outline"
                >
                  Enable Notifications
                </Button>
              )}
              {browserNotificationPermission === "granted" && (
                <span className="text-sm text-notification-success font-medium">
                  ✓ Enabled
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Theme Mode</Label>
              <RadioGroup
                value={preferences.theme}
                onValueChange={(value) => updatePreference("theme", value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="font-normal cursor-pointer flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="font-normal cursor-pointer flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="system" id="system" />
                  <Label htmlFor="system" className="font-normal cursor-pointer flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    System
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Custom Theme Colors</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomColors({
                    primary: "#232c37",
                    secondary: "#ffdd00",
                    accent: "#d4b47e",
                  })}
                >
                  <RotateCcw className="h-3 w-3 mr-2" />
                  Reset to Default
                </Button>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customColors.primary}
                      onChange={(e) => setCustomColors({ ...customColors, primary: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customColors.primary}
                      onChange={(e) => setCustomColors({ ...customColors, primary: e.target.value })}
                      placeholder="#232c37"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Secondary/Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customColors.secondary}
                      onChange={(e) => setCustomColors({ ...customColors, secondary: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customColors.secondary}
                      onChange={(e) => setCustomColors({ ...customColors, secondary: e.target.value })}
                      placeholder="#ffdd00"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Muted/Background Accent</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customColors.accent}
                      onChange={(e) => setCustomColors({ ...customColors, accent: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customColors.accent}
                      onChange={(e) => setCustomColors({ ...customColors, accent: e.target.value })}
                      placeholder="#d4b47e"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Changes will apply immediately after saving
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSavePreferences} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Preferences;
