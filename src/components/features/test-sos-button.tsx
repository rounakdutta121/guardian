"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEmergencyStore, useLocationStore } from "@/stores";
import { getBatteryLevel } from "@/lib/location/helpers";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function TestSOSButton() {
  const queryClient = useQueryClient();
  const {
    status,
    setSession,
    setStatus,
    setCountdown,
    openOverlay,
    reset,
  } = useEmergencyStore();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const finishTest = async (id: string) => {
    await fetch(`/api/emergency/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve" }),
    });
    reset();
    setSessionId(null);
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Test failed");
      }
      const session = await res.json();
      setSessionId(session.id);
      setSession(session.id, true);
      openOverlay();
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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Test SOS failed"
      );
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
    <div className="space-y-3">
      <Button
        variant="outline"
        onClick={() => setShowDisclaimer(true)}
        disabled={status !== "idle"}
        className="w-full"
      >
        Run Test SOS
      </Button>
      {sessionId && status === "active" && (
        <Button
          variant="default"
          className="w-full"
          onClick={() => finishTest(sessionId)}
        >
          Finish Test & Close Session
        </Button>
      )}
    </div>
  );
}
