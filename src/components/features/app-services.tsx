"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { syncOfflineQueue } from "@/lib/offline/client";
import { useFakeCallStore } from "@/stores";
import { useSession } from "@/lib/auth/client";
import { emergencyCommunicationService } from "@/lib/communication";
import { isCapacitorNative } from "@/lib/communication/platform";
import { triggerDueFakeCallsFromApi } from "@/lib/fake-call/trigger";
import { retryPendingCheckinEscalation } from "@/lib/checkin/client-expire";
import { toast } from "sonner";

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const { data: session } = useSession();

  useEffect(() => {
    if (isOnline && session?.user?.id) {
      syncOfflineQueue().then((count) => {
        if (count > 0) toast.success(`Synced ${count} offline action(s)`);
      });
    }
  }, [isOnline, session?.user?.id]);

  return <>{children}</>;
}

export function CommunicationRetryProvider() {
  const isOnline = useOnlineStatus();
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) return;

    const retry = async () => {
      if (!isOnline) return;
      const commCount =
        await emergencyCommunicationService.retryQueuedCommunications();
      if (commCount > 0) {
        toast.info(`Retried ${commCount} emergency communication(s)`);
      }
      if (isCapacitorNative()) {
        await retryPendingCheckinEscalation();
      }
    };

    void retry();
    const interval = setInterval(() => void retry(), 60000);

    let appHandle: { remove: () => void } | null = null;
    if (isCapacitorNative()) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void retry();
      }).then((h) => {
        appHandle = h;
      });
    }

    return () => {
      clearInterval(interval);
      appHandle?.remove();
    };
  }, [isOnline, session?.user?.id]);

  return null;
}

/** Foreground poll fallback for web and when native alarms are unavailable. */
export function FakeCallScheduler() {
  const setActiveCall = useFakeCallStore((s) => s.setActiveCall);
  const isRinging = useFakeCallStore((s) => s.isRinging);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) return;

    const poll = async () => {
      if (useFakeCallStore.getState().isRinging) return;
      try {
        const res = await fetch("/api/fake-call");
        if (!res.ok) return;
        const calls = await res.json();
        await triggerDueFakeCallsFromApi(calls, setActiveCall);
      } catch {
        // ignore poll errors
      }
    };

    poll();
    const interval = setInterval(poll, isCapacitorNative() ? 15000 : 5000);
    return () => clearInterval(interval);
  }, [setActiveCall, session?.user?.id, isRinging]);

  return null;
}
