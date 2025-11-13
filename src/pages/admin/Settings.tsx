import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function AdminSettings() {
  const { userRole } = useOutletContext<{ userRole: string }>();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    theme_primary: "#1F2937",
    theme_accent: "#F4CE63",
    dark_mode_default: false,
    highlight_delayed_tasks: true,
  });

  const isOwner = userRole === "project_owner";

  useEffect(() => {
    if (isOwner) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [isOwner]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings" as any)
        .select("setting_key, setting_value");

      if (error) throw error;

      const settingsMap: any = {};
      data?.forEach((item: any) => {
        if (item.setting_key === "dark_mode_default" || item.setting_key === "highlight_delayed_tasks") {
          settingsMap[item.setting_key] = item.setting_value === "true";
        } else {
          settingsMap[item.setting_key] = item.setting_value;
        }
      });

      setSettings((prev) => ({ ...prev, ...settingsMap }));
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.rpc("update_setting" as any, {
          key,
          value: String(value),
        });
      }

      toast.success("Settings saved successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground">Configure system preferences</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Only Project Owners can access system settings
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
        <p className="text-muted-foreground">Configure system preferences and branding</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme Colors</CardTitle>
          <CardDescription>Customize the application color scheme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Primary Color</Label>
            <Input
              type="color"
              value={settings.theme_primary}
              onChange={(e) => setSettings({ ...settings, theme_primary: e.target.value })}
            />
          </div>
          <div>
            <Label>Accent Color</Label>
            <Input
              type="color"
              value={settings.theme_accent}
              onChange={(e) => setSettings({ ...settings, theme_accent: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display Options</CardTitle>
          <CardDescription>Configure default display preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dark Mode Default</Label>
              <p className="text-sm text-muted-foreground">Enable dark mode by default</p>
            </div>
            <Switch
              checked={settings.dark_mode_default}
              onCheckedChange={(checked) => setSettings({ ...settings, dark_mode_default: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Highlight Delayed Tasks</Label>
              <p className="text-sm text-muted-foreground">Automatically highlight overdue tasks</p>
            </div>
            <Switch
              checked={settings.highlight_delayed_tasks}
              onCheckedChange={(checked) => setSettings({ ...settings, highlight_delayed_tasks: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings}>Save Settings</Button>
      </div>
    </div>
  );
}
