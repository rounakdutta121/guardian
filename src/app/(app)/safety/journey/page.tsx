"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { journeySchema, type JourneyInput } from "@/lib/validations";
import { useGeolocation } from "@/hooks/use-geolocation";
import { MapView } from "@/components/features/map-view";
import { useSettings } from "@/hooks/use-api";
import { formatDistance } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Share2,
  Square,
  Gauge,
  Battery,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function JourneyTrackingPage() {
  const queryClient = useQueryClient();
  const { data: settingsData } = useSettings();
  const { latitude, longitude } = useGeolocation(true);
  const [activeJourney, setActiveJourney] = useState<{
    id: string;
    destinationName: string;
    status: string;
    shareToken: string;
    totalDistanceMeters?: number;
    currentSpeedKmh?: number;
  } | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  useEffect(() => {
    if ("getBattery" in navigator) {
      (navigator as Navigator & { getBattery: () => Promise<{ level: number }> })
        .getBattery()
        .then((battery) => setBatteryLevel(Math.round(battery.level * 100)));
    }
  }, []);

  const { data: journeys } = useQuery({
    queryKey: ["journeys"],
    queryFn: async () => {
      const res = await fetch("/api/journey");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  useEffect(() => {
    const active = journeys?.find(
      (j: { status: string; isGuardianMode?: boolean }) =>
        !j.isGuardianMode && ["active", "paused"].includes(j.status)
    );
    if (active) setActiveJourney(active);
  }, [journeys]);

  useEffect(() => {
    if (!activeJourney || activeJourney.status !== "active" || !latitude) return;
    const interval = setInterval(() => {
      fetch(`/api/journey/${activeJourney.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, batteryLevel }),
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [activeJourney, latitude, longitude, batteryLevel]);

  const { register, handleSubmit, formState: { errors } } = useForm<JourneyInput>({
    resolver: zodResolver(journeySchema),
    defaultValues: { travelType: "walking", isGuardianMode: false },
  });

  const startJourney = async (data: JourneyInput) => {
    try {
      const res = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          originLat: latitude,
          originLng: longitude,
          originName: "Current Location",
        }),
      });
      if (!res.ok) throw new Error("Failed to start");
      const journey = await res.json();
      setActiveJourney(journey);
      queryClient.invalidateQueries({ queryKey: ["journeys"] });
      toast.success("Journey tracking started");
      if (settingsData?.settings?.journeyAutoShare && journey.shareToken) {
        const url = `${window.location.origin}/share/${journey.shareToken}`;
        navigator.clipboard.writeText(url);
        toast.info("Share link copied to clipboard");
      }
    } catch {
      toast.error("Failed to start journey");
    }
  };

  const stopJourney = async () => {
    if (!activeJourney) return;
    await fetch(`/api/journey/${activeJourney.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    setActiveJourney(null);
    queryClient.invalidateQueries({ queryKey: ["journeys"] });
    toast.success("Journey completed");
  };

  const shareJourney = () => {
    if (!activeJourney?.shareToken) return;
    const url = `${window.location.origin}/share/${activeJourney.shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied!");
  };

  return (
    <div className="pb-4">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link href="/safety">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Journey Tracking</h1>
      </div>

      <div className="space-y-5 px-5">
        {activeJourney ? (
          <>
            <Card className="overflow-hidden">
              <MapView
                latitude={latitude}
                longitude={longitude}
                className="h-40 w-full rounded-none"
              />
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="font-semibold">{activeJourney.destinationName}</p>
                  {latitude && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Current: {latitude.toFixed(4)}, {longitude?.toFixed(4)}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-secondary p-3 text-center">
                    <Gauge className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-sm font-medium">
                      {activeJourney.currentSpeedKmh?.toFixed(0) ?? "—"} km/h
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary p-3 text-center">
                    <MapPin className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-sm font-medium">
                      {activeJourney.totalDistanceMeters
                        ? formatDistance(activeJourney.totalDistanceMeters)
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary p-3 text-center">
                    <Battery className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-sm font-medium">
                      {batteryLevel ?? "—"}%
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={shareJourney}>
                    <Share2 className="mr-2 h-4 w-4" /> Share
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={stopJourney}>
                    <Square className="mr-2 h-4 w-4" /> End
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="space-y-4 p-5">
              <form onSubmit={handleSubmit(startJourney)} className="space-y-4">
                <div>
                  <Label>Destination</Label>
                  <Input {...register("destinationName")} placeholder="Where are you going?" />
                  {errors.destinationName && (
                    <p className="text-xs text-destructive">{errors.destinationName.message}</p>
                  )}
                </div>
                <div>
                  <Label>Travel Type</Label>
                  <select
                    {...register("travelType")}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
                  >
                    <option value="walking">Walking</option>
                    <option value="cycling">Cycling</option>
                    <option value="driving">Driving</option>
                    <option value="transit">Transit</option>
                  </select>
                </div>
                <Button type="submit" className="w-full">
                  Start Journey
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
          {journeys
            ?.filter((j: { isGuardianMode?: boolean }) => !j.isGuardianMode)
            .slice(0, 10)
            .map((journey: { id: string; destinationName: string; status: string; createdAt: string }) => (
            <Card key={journey.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{journey.destinationName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{journey.status}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {formatDistanceToNow(new Date(journey.createdAt), { addSuffix: true })}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
