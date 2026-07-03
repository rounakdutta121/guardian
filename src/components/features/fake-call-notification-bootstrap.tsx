"use client";

import { useEffect, useRef, useCallback } from "react";
import { App } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import { GuardianNative, isGuardianNativeAvailable } from "guardian-native";
import { useFakeCallStore } from "@/stores";
import { useSession } from "@/lib/auth/client";
import { isCapacitorNative } from "@/lib/communication/platform";
import {
  ensureFakeCallNotificationPermissions,
  syncScheduledFakeCalls,
} from "@/lib/fake-call/local-scheduler";
import {
  parseFakeCallExtra,
  triggerDueFakeCallsFromApi,
  triggerFakeCallOnDevice,
} from "@/lib/fake-call/trigger";

async function fetchFakeCalls() {
  const res = await fetch("/api/fake-call");
  if (!res.ok) return [];
  return res.json();
}

export function FakeCallNotificationBootstrap() {
  const { data: session } = useSession();
  const setActiveCall = useFakeCallStore((s) => s.setActiveCall);
  const isRinging = useFakeCallStore((s) => s.isRinging);
  const listenersReady = useRef(false);

  const pollAndTrigger = useCallback(async () => {
    if (!session?.user?.id || isRinging) return;
    const calls = await fetchFakeCalls();
    await triggerDueFakeCallsFromApi(calls, setActiveCall);
  }, [session?.user?.id, isRinging, setActiveCall]);

  const consumeNativeWake = useCallback(async () => {
    if (!isGuardianNativeAvailable() || isRinging) return;
    try {
      const pending = await GuardianNative.consumePendingFakeCallWake();
      if (!pending?.callId) return;
      await triggerFakeCallOnDevice(pending, setActiveCall);
    } catch {
      // ignore
    }
  }, [isRinging, setActiveCall]);

  const bootstrap = useCallback(async () => {
    if (!session?.user?.id || !isCapacitorNative()) return;

    await ensureFakeCallNotificationPermissions();
    const calls = await fetchFakeCalls();
    await syncScheduledFakeCalls(calls);
    await consumeNativeWake();
    await pollAndTrigger();
  }, [session?.user?.id, consumeNativeWake, pollAndTrigger]);

  useEffect(() => {
    if (!session?.user?.id || !isCapacitorNative()) return;
    void bootstrap();
  }, [session?.user?.id, bootstrap]);

  useEffect(() => {
    if (!session?.user?.id || !isCapacitorNative() || listenersReady.current) return;
    listenersReady.current = true;

    const handles: Array<{ remove: () => void }> = [];

    void LocalNotifications.addListener("localNotificationReceived", (event) => {
      const payload = parseFakeCallExtra(event.extra as Record<string, unknown>);
      if (!payload || useFakeCallStore.getState().isRinging) return;
      void triggerFakeCallOnDevice(payload, useFakeCallStore.getState().setActiveCall);
    }).then((h) => handles.push(h));

    void LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        const payload = parseFakeCallExtra(
          event.notification.extra as Record<string, unknown>
        );
        if (!payload) return;
        void triggerFakeCallOnDevice(
          payload,
          useFakeCallStore.getState().setActiveCall
        );
      }
    ).then((h) => handles.push(h));

    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        void consumeNativeWake();
        void pollAndTrigger();
      }
    }).then((h) => handles.push(h));

    return () => {
      listenersReady.current = false;
      handles.forEach((h) => h.remove());
    };
  }, [session?.user?.id, consumeNativeWake, pollAndTrigger]);

  return null;
}
