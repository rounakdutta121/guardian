"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth/client";
import {
  clearUserClientState,
  setActiveUserId,
} from "@/lib/client/user-session";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id ?? null;

    if (userId !== previousUserId.current) {
      if (
        previousUserId.current &&
        userId &&
        previousUserId.current !== userId
      ) {
        clearUserClientState();
      }
      if (!userId && previousUserId.current) {
        clearUserClientState();
      }
      setActiveUserId(userId);
      previousUserId.current = userId;
    }
  }, [session?.user?.id]);

  return <>{children}</>;
}
