"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useSettings, useProfile } from "@/hooks/use-api";
import { requestBrowserPermission } from "@/hooks/use-browser-permission";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  Shield,
  MapPin,
  Moon,
  Sun,
  Info,
  HelpCircle,
  ChevronRight,
  Clock,
  Navigation,
  Phone,
  Globe,
} from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data, isLoading, updateMutation } = useSettings();
  const { updateMutation: updateProfile } = useProfile();

  const updateSetting = (key: string, value: unknown) => {
    updateMutation.mutate(
      { settings: { [key]: value } },
      {
        onSuccess: () => toast.success("Saved"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to update"),
      }
    );
  };

  const updatePermission = async (key: string, value: boolean) => {
    if (value) {
      const granted = await requestBrowserPermission(
        key as Parameters<typeof requestBrowserPermission>[0]
      );
      if (!granted) return;
    }

    updateMutation.mutate(
      { permissions: { [key]: value } },
      {
        onSuccess: () => toast.success("Permission saved"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to update"),
      }
    );
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    updateProfile.mutate(
      { theme: newTheme },
      {
        onSuccess: () => toast.success("Theme saved"),
        onError: () => toast.error("Failed to save theme"),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="px-5 pt-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const settings = data?.settings;
  const permissions = data?.permissions;

  return (
    <div className="pb-4">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link href="/profile">
          <button className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="space-y-5 px-5">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 font-semibold">
              <Shield className="h-4 w-4" /> Emergency
            </h3>
            <div className="flex items-center justify-between gap-4">
              <Label>SOS Countdown (seconds)</Label>
              <Input
                type="number"
                className="w-20"
                key={`sos-${settings?.sosCountdownSeconds}`}
                defaultValue={settings?.sosCountdownSeconds ?? 3}
                min={1}
                max={10}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 1 && val <= 10) updateSetting("sosCountdownSeconds", val);
                }}
              />
            </div>
            <div>
              <Label>Emergency Message</Label>
              <Input
                key={`msg-${settings?.emergencyMessage}`}
                defaultValue={settings?.emergencyMessage ?? ""}
                placeholder="I need help! My location:"
                onBlur={(e) => updateSetting("emergencyMessage", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto Share Location</Label>
              <Switch
                checked={settings?.autoShareLocation ?? true}
                onCheckedChange={(v) => updateSetting("autoShareLocation", v)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 font-semibold">
              <Bell className="h-4 w-4" /> Notifications
            </h3>
            <div className="flex items-center justify-between">
              <Label>Sound</Label>
              <Switch
                checked={settings?.enableSound ?? true}
                onCheckedChange={(v) => updateSetting("enableSound", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Vibration</Label>
              <Switch
                checked={settings?.enableVibration ?? true}
                onCheckedChange={(v) => updateSetting("enableVibration", v)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4" /> Check-In & Journey
            </h3>
            <div className="flex items-center justify-between gap-4">
              <Label>Default Check-In (minutes)</Label>
              <Input
                type="number"
                className="w-24"
                key={`checkin-${settings?.defaultCheckinMinutes}`}
                defaultValue={settings?.defaultCheckinMinutes ?? 30}
                min={5}
                max={480}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 5 && val <= 480)
                    updateSetting("defaultCheckinMinutes", val);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Navigation className="h-3 w-3" /> Auto-share journeys
              </Label>
              <Switch
                checked={settings?.journeyAutoShare ?? true}
                onCheckedChange={(v) => updateSetting("journeyAutoShare", v)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Phone className="h-3 w-3" /> Fake call ringtone
              </Label>
              <select
                className="mt-2 flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
                value={settings?.fakeCallRingtone ?? "default"}
                onChange={(e) => updateSetting("fakeCallRingtone", e.target.value)}
              >
                <option value="default">Default</option>
                <option value="classic">Classic</option>
                <option value="digital">Digital</option>
                <option value="vibrate">Vibrate only</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4" /> Permissions
            </h3>
            <p className="text-xs text-muted-foreground">
              Toggles request real device permissions and save your preference.
            </p>
            {[
              { key: "location", label: "Location" },
              { key: "notifications", label: "Notifications" },
              { key: "contacts", label: "Contacts" },
              { key: "camera", label: "Camera" },
              { key: "microphone", label: "Microphone" },
              { key: "backgroundLocation", label: "Background Location" },
            ].map((perm) => (
              <div key={perm.key} className="flex items-center justify-between">
                <Label>{perm.label}</Label>
                <Switch
                  checked={
                    (permissions?.[perm.key as keyof typeof permissions] as boolean) ?? false
                  }
                  onCheckedChange={(v) => updatePermission(perm.key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 font-semibold">
              <Globe className="h-4 w-4" /> Privacy
            </h3>
            <div className="flex items-center justify-between">
              <Label>Share data for safety</Label>
              <Switch
                checked={settings?.privacyShareData ?? true}
                onCheckedChange={(v) => updateSetting("privacyShareData", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Analytics</Label>
              <Switch
                checked={settings?.analyticsEnabled ?? false}
                onCheckedChange={(v) => updateSetting("analyticsEnabled", v)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border/50 p-4">
              <Label className="mb-3 block">Theme</Label>
              <div className="flex gap-2">
                {(["light", "dark", "system"] as const).map((t) => (
                  <Button
                    key={t}
                    variant={theme === t ? "default" : "outline"}
                    size="sm"
                    className="flex-1 capitalize"
                    onClick={() => handleThemeChange(t)}
                  >
                    {t === "light" && <Sun className="mr-1 h-3 w-3" />}
                    {t === "dark" && <Moon className="mr-1 h-3 w-3" />}
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <Link
              href="/settings/about"
              className="flex items-center gap-3 border-b border-border/50 p-4 hover:bg-accent/30"
            >
              <Info className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1">About Guardian</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/settings/support"
              className="flex items-center gap-3 p-4 hover:bg-accent/30"
            >
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1">Support</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
