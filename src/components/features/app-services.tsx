"use client";

import { useEffect } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { syncOfflineQueue } from "@/lib/offline/client";
import { useFakeCallStore } from "@/stores";
import { useSession } from "@/lib/auth/client";
import { emergencyCommunicationService } from "@/lib/communication";
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
    if (!isOnline || !session?.user?.id) return;

    const retry = () => {
      emergencyCommunicationService.retryQueuedCommunications().then((count) => {
        if (count > 0) {
          toast.info(`Retried ${count} emergency communication(s)`);
        }
      });
    };

    retry();
    const interval = setInterval(retry, 60000);
    return () => clearInterval(interval);
  }, [isOnline, session?.user?.id]);

  return null;
}

export function FakeCallScheduler() {
  const { setActiveCall } = useFakeCallStore();
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/fake-call");
        if (!res.ok) return;
        const calls = await res.json();
        const now = Date.now();
        for (const call of calls) {
          if (call.status !== "scheduled") continue;
          const scheduled = new Date(call.scheduledAt).getTime();
          if (scheduled <= now) {
            await fetch(`/api/fake-call/${call.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "trigger" }),
            });
            setActiveCall(
              call.id,
              call.callerName,
              call.callerNumber ?? undefined,
              call.callerPhotoUrl ?? undefined
            );
          }
        }
      } catch {
        // ignore poll errors
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [setActiveCall, session?.user?.id]);

  return null;
}
