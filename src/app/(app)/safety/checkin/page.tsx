"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  runCheckinEscalation,
  expireCheckinOnClient,
  getCheckinRemainingMs,
  formatCheckinRemaining,
} from "@/lib/checkin/client-expire";
import {
  scheduleCheckinBackgroundEscalation,
  cancelCheckinBackgroundEscalation,
} from "@/lib/checkin/native-scheduler";

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
  const [remainingLabel, setRemainingLabel] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const expiringRef = useRef(false);

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
    if (active) {
      setActiveCheckin(active);
    } else {
      setActiveCheckin(null);
    }
  }, [checkins]);

  const handleExpire = useCallback(async () => {
    if (!activeCheckin || expiringRef.current) return;
    expiringRef.current = true;
    setShowPrompt(true);

    try {
      const { emergencySession } = await expireCheckinOnClient(activeCheckin.id);
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.warning("Check-in timer expired");
      if (emergencySession?.id) {
        toast.error(
          "Escalating to check-in contacts by priority — SMS then calls"
        );
      }
    } catch {
      expiringRef.current = false;
      toast.error("Failed to process expired check-in");
    }
  }, [activeCheckin, queryClient]);

  useEffect(() => {
    if (!activeCheckin || showPrompt) return;

    const tick = () => {
      const remainingMs = getCheckinRemainingMs(activeCheckin);
      const total = activeCheckin.durationMinutes * 60 * 1000;
      setProgress(total > 0 ? (remainingMs / total) * 100 : 0);
      setRemainingLabel(formatCheckinRemaining(remainingMs));
      if (remainingMs <= 0) {
        void handleExpire();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeCheckin, showPrompt, handleExpire]);

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
      expiringRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      await scheduleCheckinBackgroundEscalation(checkin);
      toast.success("Check-in timer started — alerts work in background");
    } catch {
      toast.error("Failed to start check-in");
    }
  };

  const confirmSafe = async () => {
    if (!activeCheckin) return;
    await cancelCheckinBackgroundEscalation(activeCheckin.id);
    await fetch(`/api/checkin/${activeCheckin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    setActiveCheckin(null);
    setShowPrompt(false);
    expiringRef.current = false;
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
    expiringRef.current = false;
    queryClient.invalidateQueries({ queryKey: ["checkins"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.error("Need help — escalating to check-in contacts by priority");
  };

  const cancelCheckin = async () => {
    if (!activeCheckin) return;
    await cancelCheckinBackgroundEscalation(activeCheckin.id);
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
              <p className="text-2xl font-bold tabular-nums">
                {remainingLabel || formatCheckinRemaining(getCheckinRemainingMs(activeCheckin))} left
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
