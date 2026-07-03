"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-api";
import { toast } from "sonner";
import { ArrowLeft, Shield } from "lucide-react";
import {
  communicationPermissions,
  requestNativeEmergencyPermissions,
} from "@/lib/communication";

export default function EmergencySettingsPage() {
  const { data, updateMutation } = useSettings();

  const grantEmergencyPermissions = async () => {
    const perms = await requestNativeEmergencyPermissions();
    const loc = await communicationPermissions.requestLocation();
    if (perms.sms && perms.phone && loc) {
      toast.success("Emergency permissions granted — SOS will work automatically");
    } else if (perms.sms || perms.phone) {
      toast.info(
        `SMS: ${perms.sms ? "✓" : "✗"} · Phone: ${perms.phone ? "✓" : "✗"} · Location: ${loc ? "✓" : "✗"}`
      );
    } else {
      toast.warning(
        "Install the Guardian Android app and grant SMS + Phone permissions for automatic emergency alerts"
      );
    }
  };

  const save = (settings: Record<string, unknown>) => {
    updateMutation.mutate(
      { settings },
      {
        onSuccess: () => toast.success("Saved"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
      }
    );
  };

  return (
    <div className="px-5 py-6 pb-20">
      <Link href="/settings">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </Link>
      <h1 className="text-2xl font-bold">Emergency Information</h1>
      <p className="mt-2 text-muted-foreground">
        Information shared during emergencies
      </p>

      <Card className="mt-6">
        <CardContent className="space-y-4 p-5">
          <div>
            <Label>Emergency Message</Label>
            <Input
              key={`em-${data?.settings?.emergencyMessage}`}
              defaultValue={data?.settings?.emergencyMessage ?? ""}
              placeholder="I need help! My location:"
              onBlur={(e) => save({ emergencyMessage: e.target.value })}
            />
          </div>
          <div>
            <Label>SOS Countdown (seconds)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              key={`sos-${data?.settings?.sosCountdownSeconds}`}
              defaultValue={data?.settings?.sosCountdownSeconds ?? 3}
              onBlur={(e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= 10) save({ sosCountdownSeconds: val });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Auto Share Location</Label>
            <Switch
              checked={data?.settings?.autoShareLocation ?? true}
              onCheckedChange={(v) => save({ autoShareLocation: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Shield className="h-4 w-4" /> Automatic Emergency Alerts
          </h2>
          <p className="text-sm text-muted-foreground">
            Grant SMS, Phone, and Location permissions so Guardian can automatically
            message all contacts and call your primary contact during SOS — using only
            your SIM card, with no third-party services.
          </p>
          <Button className="w-full" onClick={grantEmergencyPermissions}>
            Grant Emergency Permissions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
