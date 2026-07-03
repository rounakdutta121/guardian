"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEmergencyStore, useLocationStore } from "@/stores";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useSettings } from "@/hooks/use-api";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { X, MapPin, Phone, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getBatteryLevel, reverseGeocode } from "@/lib/location/helpers";
import { enqueueOfflineAction } from "@/lib/offline/client";
import { MapView } from "@/components/features/map-view";
import {
  emergencyCommunicationService,
  emergencyLocationTracker,
  communicationPermissions,
  isGuardianNativeAvailable,
} from "@/lib/communication";

interface SOSButtonProps {
  countdownSeconds?: number;
}

type TimelineEvent = {
  event: string;
  timestamp: string;
  data?: Record<string, unknown>;
};

type SessionData = {
  id: string;
  smsPreview?: string[];
  callPreview?: string[];
  timeline?: TimelineEvent[];
  mapsUrl?: string;
  latitude?: number;
  longitude?: number;
  isTest?: boolean;
};

type CommStatus = {
  smsSent: number;
  smsTotal: number;
  callInitiated: boolean;
};

async function postEmergency(body: Record<string, unknown>) {
  const res = await fetch("/api/emergency", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed");
  }
  return res.json() as Promise<SessionData>;
}

async function activateSession(sessionId: string) {
  await fetch(`/api/emergency/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "activate" }),
  });
}

export function SOSButton({ countdownSeconds: propCountdown }: SOSButtonProps) {
  const { data: settingsData } = useSettings();
  const countdownSeconds =
    propCountdown ?? settingsData?.settings?.sosCountdownSeconds ?? 3;

  const { latitude, longitude, accuracy } = useGeolocation(true);
  const { status, countdown, setSession, setStatus, setCountdown, reset, isTest } =
    useEmergencyStore();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [commStatus, setCommStatus] = useState<CommStatus | null>(null);

  const buildPayload = useCallback(
    async (test: boolean) => {
      const battery = await getBatteryLevel();
      let address: string | undefined;
      if (latitude && longitude) {
        address = (await reverseGeocode(latitude, longitude)) ?? undefined;
        useLocationStore.getState().setAddress(address ?? "");
      }
      return {
        trigger: test ? "test_sos" : "sos_button",
        isTest: test,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        accuracy: accuracy ?? undefined,
        address,
        batteryLevel: battery ?? undefined,
      };
    },
    [latitude, longitude, accuracy]
  );

  const runNativeCommunications = useCallback(
    async (session: SessionData, test: boolean) => {
      const battery = await getBatteryLevel();
      const result =
        await emergencyCommunicationService.executeEmergencyCommunications({
          sessionId: session.id,
          isTest: test,
          context: {
            mapsUrl: session.mapsUrl ?? null,
            latitude: session.latitude ?? latitude ?? null,
            longitude: session.longitude ?? longitude ?? null,
            batteryLevel: battery,
          },
        });

      setCommStatus({
        smsSent: result.sms.filter((s) => s.success).length,
        smsTotal: result.sms.length,
        callInitiated: result.call.success,
      });

      if (!test) {
        const failedSms = result.sms.filter((s) => !s.success).length;
        if (failedSms > 0) {
          toast.warning(
            `${failedSms} SMS failed — queued for automatic retry`
          );
        }
        if (result.call.success && result.call.method === "automatic") {
          toast.success("Calling primary contact automatically");
        } else if (result.call.success && result.call.method === "native_dialer") {
          toast.info("Dialer opened — tap call to reach primary contact");
        } else if (result.call.success) {
          toast.info("Opening phone app for primary contact");
        }
        const composerUsed = result.sms.some((s) => s.method === "native_composer");
        if (composerUsed) {
          toast.info("SMS app opened — tap send to message your contacts");
        }
      }

      setSessionData((prev) =>
        prev
          ? {
              ...prev,
              timeline: [
                ...(prev.timeline ?? []),
                ...result.timelineEvents,
              ],
            }
          : prev
      );
    },
    [latitude, longitude]
  );

  const startTracking = useCallback((sessionId: string) => {
    emergencyLocationTracker.start(
      sessionId,
      () => {
        const { latitude: lat, longitude: lng, accuracy: acc } =
          useLocationStore.getState();
        return { latitude: lat, longitude: lng, accuracy: acc };
      },
      getBatteryLevel
    );
  }, []);

  const onCountdownComplete = useCallback(
    async (session: SessionData, test: boolean) => {
      setStatus("active");
      try {
        await activateSession(session.id);
      } catch {
        toast.warning("Activation saved locally — syncing when online");
      }

      if (!test) {
        const perms = await communicationPermissions.ensureEmergencyPermissions();
        if (!perms.sms && !perms.phone) {
          toast.warning(
            isGuardianNativeAvailable()
              ? "SMS/Phone permissions denied — will open SMS app and dialer instead"
              : "Rebuild the Android app (cap sync) for emergency SMS and calls"
          );
        }
      }

      await runNativeCommunications(session, test);
      startTracking(session.id);
    },
    [setStatus, runNativeCommunications, startTracking]
  );

  const startEmergency = useCallback(
    async (test = false) => {
      try {
        const payload = await buildPayload(test);
        const session = await postEmergency(payload);
        setSession(session.id, test);
        setSessionData(session);

        const initialCount = test ? 3 : countdownSeconds;
        let count = initialCount;
        setCountdown(count);
        setStatus("countdown");

        const interval = setInterval(() => {
          count -= 1;
          setCountdown(count);
          if (count <= 0) {
            clearInterval(interval);
            onCountdownComplete(session, test);
          }
        }, 1000);
      } catch {
        const payload = await buildPayload(test);
        enqueueOfflineAction("emergency_start", payload);
        toast.warning("Offline — emergency queued for sync");
      }
    },
    [
      buildPayload,
      countdownSeconds,
      setSession,
      setStatus,
      setCountdown,
      onCountdownComplete,
    ]
  );

  useEffect(() => {
    return () => {
      emergencyLocationTracker.stop();
    };
  }, []);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (data.activeEmergency && status === "idle") {
          setSession(data.activeEmergency.id, data.activeEmergency.isTest);
          setSessionData(data.activeEmergency);
          setStatus("active");
          startTracking(data.activeEmergency.id);
        }
      })
      .catch(() => {});
  }, [status, setSession, setStatus, startTracking]);

  const cancelEmergency = async () => {
    if (sessionData?.id) {
      await fetch(`/api/emergency/${sessionData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
    }
    emergencyLocationTracker.stop();
    reset();
    setSessionData(null);
    setCommStatus(null);
    toast.info("Emergency cancelled");
  };

  const resolveEmergency = async () => {
    if (sessionData?.id) {
      await fetch(`/api/emergency/${sessionData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve" }),
      });
      emergencyLocationTracker.clearLocalHistory(sessionData.id);
    }
    emergencyLocationTracker.stop();
    reset();
    setSessionData(null);
    setCommStatus(null);
    toast.success("Emergency resolved");
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="sos"
            size="sos"
            className="sos-pulse"
            onClick={() => startEmergency(false)}
            disabled={status !== "idle"}
          >
            SOS
          </Button>
        </motion.div>
        <p className="text-center text-xs text-muted-foreground">
          Tap to activate emergency
        </p>
      </div>

      <AnimatePresence>
        {(status === "countdown" || status === "active") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm space-y-4 py-4"
            >
              {status === "countdown" && (
                <div className="text-center">
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-8xl font-bold text-white"
                  >
                    {countdown}
                  </motion.div>
                  <p className="mt-4 text-lg text-white/80">
                    {isTest ? "Starting test simulation..." : "Activating emergency..."}
                  </p>
                  <Button variant="outline" className="mt-6 w-full" onClick={cancelEmergency}>
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                </div>
              )}

              {status === "active" && sessionData && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive">
                      <span className="text-2xl font-bold text-white">
                        {isTest ? "TEST" : "SOS"}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      {isTest ? "Test Simulation Active" : "Emergency Active"}
                    </h2>
                    <p className="mt-1 text-sm text-white/70">
                      {isTest
                        ? "Simulation only — no SMS or calls sent"
                        : "Auto SMS & call via your SIM — live tracking active"}
                    </p>
                    {commStatus && !isTest && (
                      <p className="mt-2 text-xs text-white/60">
                        SMS: {commStatus.smsSent}/{commStatus.smsTotal} opened ·{" "}
                        {commStatus.callInitiated ? "Call initiated" : "Call queued"}
                      </p>
                    )}
                  </div>

                  <MapView
                    latitude={sessionData.latitude ?? latitude}
                    longitude={sessionData.longitude ?? longitude}
                    className="h-36 w-full rounded-2xl"
                  />

                  {sessionData.mapsUrl && (
                    <Card>
                      <CardContent className="p-4">
                        <a
                          href={sessionData.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary"
                        >
                          <MapPin className="h-4 w-4" /> Open in Google Maps
                        </a>
                      </CardContent>
                    </Card>
                  )}

                  {sessionData.smsPreview && sessionData.smsPreview.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                          <MessageSquare className="h-4 w-4" />
                          {isTest ? "Simulated SMS" : "Emergency SMS (Device)"}
                        </div>
                        {sessionData.smsPreview.map((sms, i) => (
                          <p key={i} className="mt-1 rounded-lg bg-muted p-2 text-xs text-muted-foreground whitespace-pre-line">
                            {sms}
                          </p>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {sessionData.callPreview && sessionData.callPreview.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                          <Phone className="h-4 w-4" />
                          {isTest ? "Simulated Calls" : "Primary Contact Call"}
                        </div>
                        {sessionData.callPreview.map((call, i) => (
                          <p key={i} className="text-sm text-muted-foreground">{call}</p>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {sessionData.timeline && sessionData.timeline.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                          <Clock className="h-4 w-4" /> Timeline
                        </div>
                        {sessionData.timeline.map((t, i) => (
                          <div key={i} className="border-l-2 border-primary/30 pl-3 py-1">
                            <p className="text-xs font-medium capitalize">
                              {t.event.replace(/_/g, " ")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(t.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={resolveEmergency}>
                      I&apos;m Safe
                    </Button>
                    {!isTest && (
                      <Button variant="destructive" className="flex-1" onClick={cancelEmergency}>
                        Cancel
                      </Button>
                    )}
                    {isTest && (
                      <Button variant="outline" className="flex-1" onClick={resolveEmergency}>
                        Finish Test
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
