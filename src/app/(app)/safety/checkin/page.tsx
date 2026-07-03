"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { safeCheckinSchema, type SafeCheckinInput } from "@/lib/validations";
import { useSettings } from "@/hooks/use-api";
import { toast } from "sonner";
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocationStore } from "@/stores";
import { getBatteryLevel } from "@/lib/location/helpers";
import {
  emergencyCommunicationService,
  emergencyLocationTracker,
  abortEscalation,
} from "@/lib/communication";
import { generateMapsUrl } from "@/lib/utils";

const PRESETS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
];

export default function SafeCheckinPage() {
  const queryClient = useQueryClient();
  const { data: settingsData } = useSettings();
  const [activeCheckin, setActiveCheckin] = useState<{
    id: string;
    expiresAt: string;
    durationMinutes: number;
  } | null>(null);
  const [progress, setProgress] = useState(100);
  const [showPrompt, setShowPrompt] = useState(false);

  const { data: checkins } = useQuery({
    queryKey: ["checkins"],
    queryFn: async () => {
      const res = await fetch("/api/checkin");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  useEffect(() => {
    const active = checkins?.find((c: { status: string }) => c.status === "active");
    if (active) setActiveCheckin(active);
  }, [checkins]);

  const runCheckinEscalation = async (
    session: { id: string },
    reason: "checkin_need_help" | "checkin_missed"
  ) => {
    const { latitude, longitude, accuracy } = useLocationStore.getState();
    const battery = await getBatteryLevel();
    const mapsUrl =
      latitude && longitude ? generateMapsUrl(latitude, longitude) : null;

    await emergencyCommunicationService.executeEmergencyCommunications({
      sessionId: session.id,
      isTest: false,
      mode: "checkin",
      context: {
        mapsUrl,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        batteryLevel: battery,
        reason,
      },
    });

    emergencyLocationTracker.start(
      session.id,
      () => {
        const loc = useLocationStore.getState();
        return {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
        };
      },
      getBatteryLevel
    );
  };

  const handleExpire = useCallback(async () => {
    if (!activeCheckin) return;
    setShowPrompt(true);
    const { latitude, longitude, accuracy } = useLocationStore.getState();
    const battery = await getBatteryLevel();
    const res = await fetch(`/api/checkin/${activeCheckin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "expire",
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        accuracy: accuracy ?? undefined,
        batteryLevel: battery ?? undefined,
      }),
    });
    queryClient.invalidateQueries({ queryKey: ["checkins"] });
    toast.warning("Check-in timer expired");

    if (res.ok) {
      const data = await res.json();
      if (data.emergencySession?.id) {
        await runCheckinEscalation(data.emergencySession, "checkin_missed");
        toast.error(
          "Escalating to check-in contacts by priority — SMS then calls"
        );
      }
    }
  }, [activeCheckin, queryClient]);

  useEffect(() => {
    if (!activeCheckin) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const expires = new Date(activeCheckin.expiresAt).getTime();
      const total = activeCheckin.durationMinutes * 60 * 1000;
      const remaining = Math.max(0, expires - now);
      setProgress((remaining / total) * 100);
      if (remaining <= 0) {
        clearInterval(interval);
        handleExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCheckin, handleExpire]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SafeCheckinInput>({
    resolver: zodResolver(safeCheckinSchema),
    defaultValues: {
      durationMinutes: settingsData?.settings?.defaultCheckinMinutes ?? 30,
      notifyContacts: true,
    },
  });

  const startCheckin = async (data: SafeCheckinInput) => {
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to start");
      const checkin = await res.json();
      setActiveCheckin(checkin);
      setShowPrompt(false);
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      toast.success("Check-in timer started");
    } catch {
      toast.error("Failed to start check-in");
    }
  };

  const confirmSafe = async () => {
    if (!activeCheckin) return;
    await fetch(`/api/checkin/${activeCheckin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    setActiveCheckin(null);
    setShowPrompt(false);
    queryClient.invalidateQueries({ queryKey: ["checkins"] });
    toast.success("You're marked as safe!");
  };

  const needHelp = async () => {
    if (!activeCheckin) return;
    const { latitude, longitude, accuracy } = useLocationStore.getState();
    const battery = await getBatteryLevel();
    const res = await fetch(`/api/checkin/${activeCheckin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "need_help",
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        accuracy: accuracy ?? undefined,
        batteryLevel: battery ?? undefined,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to activate emergency");
      return;
    }
    const session = await res.json();
    const emergencySession = session.emergencySession ?? session;
    await runCheckinEscalation(emergencySession, "checkin_need_help");
    setActiveCheckin(null);
    setShowPrompt(false);
    queryClient.invalidateQueries({ queryKey: ["checkins"] });
    toast.error("Need help — escalating to check-in contacts by priority");
  };

  const cancelCheckin = async () => {
    if (!activeCheckin) return;
    await fetch(`/api/checkin/${activeCheckin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setActiveCheckin(null);
    setShowPrompt(false);
    queryClient.invalidateQueries({ queryKey: ["checkins"] });
    toast.info("Check-in cancelled");
  };

  return (
    <div className="pb-4">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link href="/safety">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-xl font-bold">Safe Check-In</h1>
      </div>

      <div className="space-y-5 px-5">
        {showPrompt && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="space-y-4 p-6 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
              <p className="text-lg font-semibold">Are you safe?</p>
              <div className="flex flex-col gap-3">
                <Button onClick={confirmSafe} size="lg">
                  <CheckCircle className="mr-2 h-5 w-5" /> Yes, I&apos;m Safe
                </Button>
                <Button onClick={needHelp} variant="destructive" size="lg">
                  <AlertTriangle className="mr-2 h-5 w-5" /> Need Help
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeCheckin && !showPrompt ? (
          <Card>
            <CardContent className="space-y-6 p-6 text-center">
              <Clock className="mx-auto h-12 w-12 text-primary" />
              <p className="text-2xl font-bold">
                {formatDistanceToNow(new Date(activeCheckin.expiresAt))} left
              </p>
              <Progress value={progress} className="h-2" />
              <div className="flex flex-col gap-3">
                <Button onClick={confirmSafe} className="w-full" size="lg">
                  <CheckCircle className="mr-2 h-5 w-5" /> I&apos;m Safe
                </Button>
                <Button onClick={needHelp} variant="destructive" className="w-full">
                  Need Help
                </Button>
                <Button onClick={cancelCheckin} variant="outline" className="w-full">
                  <X className="mr-2 h-4 w-4" /> Cancel Check-In
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : !showPrompt ? (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p.minutes}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValue("durationMinutes", p.minutes)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <form onSubmit={handleSubmit(startCheckin)} className="space-y-4">
                <div>
                  <Label>Custom duration (minutes)</Label>
                  <Input type="number" min={5} max={480} {...register("durationMinutes", { valueAsNumber: true })} />
                  {errors.durationMinutes && <p className="text-xs text-destructive">{errors.durationMinutes.message}</p>}
                </div>
                <div>
                  <Label>Message (optional)</Label>
                  <Input {...register("message")} placeholder="Walking home from work" />
                </div>
                <Button type="submit" className="w-full">Start Check-In Timer</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {checkins?.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
            {checkins.filter((c: { status: string }) => c.status !== "active").slice(0, 10).map((checkin: { id: string; status: string; durationMinutes: number; createdAt: string }) => (
              <Card key={checkin.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{checkin.durationMinutes} min check-in</p>
                    <p className="text-xs text-muted-foreground capitalize">{checkin.status}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(checkin.createdAt), { addSuffix: true })}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
