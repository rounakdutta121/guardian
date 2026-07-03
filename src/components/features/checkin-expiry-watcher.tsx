"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  expireCheckinOnClient,
  getCheckinRemainingMs,
} from "@/lib/checkin/client-expire";

type ActiveCheckin = {
  id: string;
  status: string;
  expiresAt: string;
  notifyContacts: boolean;
};

/**
 * Expires active check-ins when the timer runs out, even if the user
 * left the check-in page (timer only lived on that page before).
 */
export function CheckinExpiryWatcher() {
  const queryClient = useQueryClient();
  const expiringRef = useRef<string | null>(null);

  const { data: checkins } = useQuery({
    queryKey: ["checkins"],
    queryFn: async () => {
      const res = await fetch("/api/checkin");
      if (!res.ok) throw new Error("Failed to fetch check-ins");
      return res.json() as Promise<ActiveCheckin[]>;
    },
    refetchInterval: 60_000,
  });

  const active = checkins?.find((c) => c.status === "active") ?? null;

  useEffect(() => {
    if (!active) {
      expiringRef.current = null;
      return;
    }

    const remainingMs = getCheckinRemainingMs(active);
    if (remainingMs <= 0) {
      if (expiringRef.current === active.id) return;
      expiringRef.current = active.id;
      void runExpire(active.id);
      return;
    }

    const timeout = window.setTimeout(() => {
      if (expiringRef.current === active.id) return;
      expiringRef.current = active.id;
      void runExpire(active.id);
    }, remainingMs);

    async function runExpire(checkinId: string) {
      try {
        const { emergencySession } = await expireCheckinOnClient(checkinId);
        queryClient.invalidateQueries({ queryKey: ["checkins"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        toast.warning("Check-in timer expired");
        if (emergencySession?.id) {
          toast.error(
            "Escalating to check-in contacts by priority — SMS then calls"
          );
        }
      } catch {
        expiringRef.current = null;
        toast.error("Failed to process expired check-in");
      }
    }

    return () => window.clearTimeout(timeout);
  }, [active, queryClient]);

  return null;
}
