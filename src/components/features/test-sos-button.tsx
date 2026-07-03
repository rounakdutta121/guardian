"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEmergencyStore, useLocationStore } from "@/stores";
import { getBatteryLevel } from "@/lib/location/helpers";
import { toast } from "sonner";

export function TestSOSButton() {
  const { status, setSession, setStatus, setCountdown } = useEmergencyStore();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const { latitude, longitude, accuracy } = useLocationStore.getState();
      const battery = await getBatteryLevel();
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: "test_sos",
          isTest: true,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          accuracy: accuracy ?? undefined,
          batteryLevel: battery ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("Test failed");
      const session = await res.json();
      setSession(session.id, true);
      setStatus("countdown");
      let count = 3;
      setCountdown(count);
      const interval = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          setStatus("active");
          fetch(`/api/emergency/${session.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "activate" }),
          });
        }
      }, 1000);
      setShowDisclaimer(false);
    } catch {
      toast.error("Test SOS failed");
    } finally {
      setLoading(false);
    }
  };

  if (showDisclaimer) {
    return (
      <div className="space-y-3">
        <p className="text-center text-sm text-muted-foreground">
          Safe simulation only. No SMS or calls will be sent.
        </p>
        <Button className="w-full" onClick={runTest} disabled={loading}>
          {loading ? "Starting..." : "Start 3-Second Countdown"}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => setShowDisclaimer(false)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => setShowDisclaimer(true)}
      disabled={status !== "idle"}
      className="w-full"
    >
      Run Test SOS
    </Button>
  );
}
