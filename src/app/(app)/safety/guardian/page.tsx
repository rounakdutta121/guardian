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
import { Switch } from "@/components/ui/switch";
import { journeySchema, type JourneyInput } from "@/lib/validations";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useEmergencyContacts } from "@/hooks/use-api";
import { MapView } from "@/components/features/map-view";
import { getBatteryLevel, getNetworkStatus } from "@/lib/location/helpers";
import { toast } from "sonner";
import {
  ArrowLeft,
  Navigation,
  Pause,
  Play,
  Square,
  MapPin,
  Clock,
  Share2,
  Battery,
  Signal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function GuardianModePage() {
  const queryClient = useQueryClient();
  const { latitude, longitude } = useGeolocation(true);
  const { data: contacts } = useEmergencyContacts();
  const [activeJourney, setActiveJourney] = useState<{
    id: string;
    destinationName: string;
    status: string;
    shareToken: string;
    etaMinutes?: number;
    currentSpeedKmh?: number;
  } | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline" | "slow">("online");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  useEffect(() => {
    getBatteryLevel().then(setBatteryLevel);
    setNetworkStatus(getNetworkStatus());
    const interval = setInterval(() => {
      getBatteryLevel().then(setBatteryLevel);
      setNetworkStatus(getNetworkStatus());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const journeyContacts = contacts?.filter(
    (c: { notifyOnJourney: boolean; id: string }) => c.notifyOnJourney
  ) ?? [];

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
      (j: { status: string; isGuardianMode: boolean }) =>
        j.isGuardianMode && ["active", "paused"].includes(j.status)
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
    }, 15000);
    return () => clearInterval(interval);
  }, [activeJourney, latitude, longitude, batteryLevel]);

  const { register, handleSubmit, formState: { errors } } = useForm<JourneyInput>({
    resolver: zodResolver(journeySchema),
    defaultValues: { travelType: "walking", isGuardianMode: true },
  });

  const startGuardian = async (data: JourneyInput) => {
    try {
      const res = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          isGuardianMode: true,
          originLat: latitude,
          originLng: longitude,
        }),
      });
      if (!res.ok) throw new Error("Failed to start");
      const journey = await res.json();
      setActiveJourney(journey);
      queryClient.invalidateQueries({ queryKey: ["journeys"] });
      toast.success("Guardian Mode activated");
    } catch {
      toast.error("Failed to start Guardian Mode");
    }
  };

  const journeyAction = async (action: string) => {
    if (!activeJourney) return;
    try {
      await fetch(`/api/journey/${activeJourney.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (action === "stop") {
        setActiveJourney(null);
        toast.success("Guardian Mode stopped");
      } else {
        setActiveJourney({ ...activeJourney, status: action === "pause" ? "paused" : "active" });
        toast.success(action === "pause" ? "Tracking paused" : "Tracking resumed");
      }
      queryClient.invalidateQueries({ queryKey: ["journeys"] });
    } catch {
      toast.error("Action failed");
    }
  };

  const shareJourney = () => {
    if (!activeJourney?.shareToken) return;
    const url = `${window.location.origin}/share/${activeJourney.shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied!");
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="pb-4">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link href="/safety">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Guardian Mode</h1>
      </div>

      <div className="space-y-5 px-5">
        {activeJourney ? (
          <>
            <Card className="overflow-hidden border-primary/30 bg-primary/5">
              <MapView
                latitude={latitude}
                longitude={longitude}
                className="h-44 w-full rounded-none"
              />
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
                    <Navigation className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Live Tracking Active</p>
                    <p className="text-sm text-muted-foreground">
                      To: {activeJourney.destinationName}
                    </p>
                    {activeJourney.etaMinutes && (
                      <p className="text-xs text-muted-foreground">
                        ETA: ~{activeJourney.etaMinutes} min
                      </p>
                    )}
                  </div>
                </div>
                {latitude && (
                  <p className="text-xs text-muted-foreground">
                    <MapPin className="inline h-3 w-3 mr-1" />
                    {latitude.toFixed(4)}, {longitude?.toFixed(4)}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-xl bg-secondary p-2">
                    <Battery className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 font-medium">{batteryLevel ?? "—"}%</p>
                  </div>
                  <div className="rounded-xl bg-secondary p-2">
                    <Signal className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 font-medium capitalize">{networkStatus}</p>
                  </div>
                  <div className="rounded-xl bg-secondary p-2">
                    <Navigation className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 font-medium">
                      {activeJourney.currentSpeedKmh?.toFixed(0) ?? "—"} km/h
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={shareJourney}>
                    <Share2 className="mr-2 h-4 w-4" /> Share
                  </Button>
                  {activeJourney.status === "active" ? (
                    <Button variant="outline" className="flex-1" onClick={() => journeyAction("pause")}>
                      <Pause className="mr-2 h-4 w-4" /> Pause
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex-1" onClick={() => journeyAction("resume")}>
                      <Play className="mr-2 h-4 w-4" /> Resume
                    </Button>
                  )}
                  <Button variant="destructive" className="flex-1" onClick={() => journeyAction("stop")}>
                    <Square className="mr-2 h-4 w-4" /> Stop
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="space-y-4 p-5">
              <form onSubmit={handleSubmit(startGuardian)} className="space-y-4">
                <div>
                  <Label>Destination</Label>
                  <Input {...register("destinationName")} placeholder="Home, Office..." />
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
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label>Expected Arrival (minutes)</Label>
                  <Input type="number" {...register("etaMinutes", { valueAsNumber: true })} placeholder="30" />
                </div>
                {journeyContacts.length > 0 && (
                  <div className="space-y-2">
                    <Label>Trusted Contacts (notify on journey)</Label>
                    {journeyContacts.map((contact: { id: string; name: string; phone: string }) => (
                      <div key={contact.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.phone}</p>
                        </div>
                        <Switch
                          checked={selectedContactIds.includes(contact.id)}
                          onCheckedChange={() => toggleContact(contact.id)}
                        />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Contacts with &quot;Notify on Journey&quot; enabled will be alerted automatically.
                    </p>
                  </div>
                )}
                <Button type="submit" className="w-full">
                  <Navigation className="mr-2 h-4 w-4" />
                  Start Guardian Mode
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Journey History</h2>
          {journeys
            ?.filter((j: { isGuardianMode: boolean }) => j.isGuardianMode)
            .slice(0, 10)
            .map((journey: { id: string; destinationName: string; status: string; createdAt: string }) => (
              <Card key={journey.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{journey.destinationName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{journey.status}</p>
                  </div>
                  <div className="text-right">
                    <Clock className="inline h-3 w-3 mr-1 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(journey.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
