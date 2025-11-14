import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";

interface UserPreferences {
  dashboard_view: string;
  show_metrics: boolean;
  show_filters: boolean;
  notifications_email: boolean;
  notifications_in_app: boolean;
  notifications_task_assigned: boolean;
  notifications_task_completed: boolean;
  notifications_task_updated: boolean;
  theme: string;
}

const Preferences = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    dashboard_view: "comfortable",
    show_metrics: true,
    show_filters: true,
    notifications_email: true,
    notifications_in_app: true,
    notifications_task_assigned: true,
    notifications_task_completed: true,
    notifications_task_updated: true,
    theme: "system",
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
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching preferences:", error);
    } else if (data) {
      setPreferences(data);
      // Sync theme with context
      if (data.theme) {
        setTheme(data.theme as "light" | "dark" | "system");
      }
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("user_preferences")
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-xl font-bold">Preferences</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
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
          <CardContent>
            <div className="space-y-2">
              <Label>Theme</Label>
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
      </main>
    </div>
  );
};

export default Preferences;
