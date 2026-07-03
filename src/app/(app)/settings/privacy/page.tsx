"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/use-api";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function PrivacySettingsPage() {
  const { data, updateMutation } = useSettings();

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
      <h1 className="text-2xl font-bold">Privacy</h1>
      <p className="mt-2 text-muted-foreground">Control your data and privacy</p>

      <Card className="mt-6">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>Share data for safety features</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Location and journey data used for SOS and tracking
              </p>
            </div>
            <Switch
              checked={data?.settings?.privacyShareData ?? true}
              onCheckedChange={(v) => save({ privacyShareData: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Analytics</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Help improve Guardian with anonymous usage data
              </p>
            </div>
            <Switch
              checked={data?.settings?.analyticsEnabled ?? false}
              onCheckedChange={(v) => save({ analyticsEnabled: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
