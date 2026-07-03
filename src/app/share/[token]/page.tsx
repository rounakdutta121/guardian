"use client";

import { useEffect, useState } from "react";
import { MapView } from "@/components/features/map-view";
import { formatDistance } from "@/lib/utils";
import { Shield, MapPin, Gauge, Battery } from "lucide-react";

interface ShareData {
  destinationName: string;
  destinationLat?: number;
  destinationLng?: number;
  status: string;
  totalDistanceMeters?: number;
  currentSpeedKmh?: number;
  batteryLevel?: number;
  etaMinutes?: number;
  isGuardianMode: boolean;
  locations: Array<{ latitude: number; longitude: number }>;
}

export default function ShareJourneyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    const load = () => {
      fetch(`/api/share/${token}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Journey not found");
          return res.json();
        })
        .then(setData)
        .catch(() => setError("This journey is not available or has ended"));
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading journey...</p>
      </div>
    );
  }

  const latest = data.locations[data.locations.length - 1];

  return (
    <div className="min-h-screen bg-background p-5 pb-10">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Guardian Live Share</h1>
            <p className="text-sm text-muted-foreground capitalize">{data.status}</p>
          </div>
        </div>

        <MapView
          latitude={latest?.latitude}
          longitude={latest?.longitude}
          destinationLat={data.destinationLat}
          destinationLng={data.destinationLng}
          className="h-56 w-full rounded-2xl"
        />

        <div className="rounded-2xl border p-5 space-y-3">
          <p className="font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {data.destinationName}
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-secondary p-3">
              <Gauge className="mx-auto h-4 w-4" />
              <p className="mt-1 text-sm font-medium">
                {data.currentSpeedKmh?.toFixed(0) ?? "—"} km/h
              </p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <MapPin className="mx-auto h-4 w-4" />
              <p className="mt-1 text-sm font-medium">
                {data.totalDistanceMeters
                  ? formatDistance(data.totalDistanceMeters)
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <Battery className="mx-auto h-4 w-4" />
              <p className="mt-1 text-sm font-medium">{data.batteryLevel ?? "—"}%</p>
            </div>
          </div>
          {data.etaMinutes && (
            <p className="text-sm text-muted-foreground">ETA: ~{data.etaMinutes} min</p>
          )}
        </div>
      </div>
    </div>
  );
}
