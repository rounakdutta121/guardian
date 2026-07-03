"use client";

import { useEffect, useRef, useCallback } from "react";
import { App } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import { GuardianNative, isGuardianNativeAvailable } from "guardian-native";
import { useSession } from "@/lib/auth/client";
import { isCapacitorNative } from "@/lib/communication/platform";
import {
  syncActiveCheckinSchedules,
  wasNativeCheckinEscalationExecuted,
} from "@/lib/checkin/native-scheduler";
import {
  expireCheckinOnClient,
  retryPendingCheckinEscalation,
  getCheckinRemainingMs,
} from "@/lib/checkin/client-expire";
import { ensureFakeCallNotificationPermissions } from "@/lib/fake-call/local-scheduler";
import type { ActiveCheckinSchedule } from "@/lib/checkin/types";
import { toast } from "sonner";

async function fetchCheckins(): Promise<ActiveCheckinSchedule[]> {
  const res = await fetch("/api/checkin");
  if (!res.ok) return [];
  return res.json();
}

export function CheckinExpiryBootstrap() {
  const { data: session } = useSession();
  const handledRef = useRef<Set<string>>(new Set());

  const processExpiredCheckin = useCallback(
    async (checkinId: string, options?: { silent?: boolean }) => {
      if (handledRef.current.has(checkinId)) return;
      handledRef.current.add(checkinId);

      try {
        const nativeRan = await wasNativeCheckinEscalationExecuted(checkinId);
        const { emergencySession } = await expireCheckinOnClient(checkinId, {
          skipEscalation: nativeRan,
        });

        if (!options?.silent) {
          toast.warning("Check-in timer expired");
          if (emergencySession?.id) {
            toast.error(
              nativeRan
                ? "Contacts alerted from background — syncing session"
                : "Escalating to check-in contacts by priority"
            );
          }
        }
      } catch {
        handledRef.current.delete(checkinId);
      }
    },
    []
  );

  const consumeNativePending = useCallback(async () => {
    if (!isGuardianNativeAvailable()) return;
    try {
      const pending = await GuardianNative.consumePendingCheckinExpire();
      if (pending?.checkinId) {
        await processExpiredCheckin(pending.checkinId);
      }
    } catch {
      // ignore
    }
  }, [processExpiredCheckin]);

  const syncOverdueCheckins = useCallback(async () => {
    const checkins = await fetchCheckins();
    const active = checkins.find((c) => c.status === "active");
    if (active && getCheckinRemainingMs(active) <= 0) {
      await processExpiredCheckin(active.id);
    }
    await syncActiveCheckinSchedules(checkins);
  }, [processExpiredCheckin]);

  const bootstrap = useCallback(async () => {
    if (!session?.user?.id || !isCapacitorNative()) return;
    await ensureFakeCallNotificationPermissions();
    await consumeNativePending();
    await retryPendingCheckinEscalation();
    await syncOverdueCheckins();
  }, [session?.user?.id, consumeNativePending, syncOverdueCheckins]);

  useEffect(() => {
    if (!session?.user?.id || !isCapacitorNative()) return;
    void bootstrap();
  }, [session?.user?.id, bootstrap]);

  useEffect(() => {
    if (!session?.user?.id || !isCapacitorNative()) return;

    const handles: Array<{ remove: () => void }> = [];

    void LocalNotifications.addListener(
      "localNotificationReceived",
      (event) => {
        const extra = event.extra as Record<string, unknown> | undefined;
        if (extra?.kind !== "checkin_expire") return;
        const checkinId = extra.checkinId;
        if (typeof checkinId !== "string") return;
        void processExpiredCheckin(checkinId);
      }
    ).then((h) => handles.push(h));

    void LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        const extra = event.notification.extra as Record<string, unknown>;
        if (extra?.kind !== "checkin_expire") return;
        const checkinId = extra.checkinId;
        if (typeof checkinId !== "string") return;
        void processExpiredCheckin(checkinId);
      }
    ).then((h) => handles.push(h));

    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        void consumeNativePending();
        void retryPendingCheckinEscalation();
        void syncOverdueCheckins();
      }
    }).then((h) => handles.push(h));

    return () => handles.forEach((h) => h.remove());
  }, [
    session?.user?.id,
    consumeNativePending,
    syncOverdueCheckins,
    processExpiredCheckin,
  ]);

  return null;
}
