"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isCapacitorNative } from "@/lib/communication/platform";
import {
  expireCheckinOnClient,
  getCheckinRemainingMs,
} from "@/lib/checkin/client-expire";
import { syncActiveCheckinSchedules } from "@/lib/checkin/native-scheduler";
import type { ActiveCheckinSchedule } from "@/lib/checkin/types";

/**
 * Foreground timer fallback — native alarms handle background/minimized state.
 */
export function CheckinExpiryWatcher() {
  const queryClient = useQueryClient();
  const expiringRef = useRef<string | null>(null);

  const { data: checkins } = useQuery({
    queryKey: ["checkins"],
    queryFn: async () => {
      const res = await fetch("/api/checkin");
      if (!res.ok) throw new Error("Failed to fetch check-ins");
      return res.json() as Promise<ActiveCheckinSchedule[]>;
    },
    refetchInterval: 60_000,
  });

  const active = checkins?.find((c) => c.status === "active") ?? null;

  useEffect(() => {
    if (!checkins || !isCapacitorNative()) return;
    void syncActiveCheckinSchedules(checkins);
  }, [checkins]);

  useEffect(() => {
    if (!active) {
      expiringRef.current = null;
      return;
    }

    const remainingMs = getCheckinRemainingMs(active);

    const runExpire = async (checkinId: string) => {
      try {
        await expireCheckinOnClient(checkinId);
        queryClient.invalidateQueries({ queryKey: ["checkins"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      } catch {
        expiringRef.current = null;
      }
    };

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

    return () => window.clearTimeout(timeout);
  }, [active, queryClient]);

  return null;
}
