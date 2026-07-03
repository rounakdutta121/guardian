"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { communicationPermissions } from "@/lib/communication";

const STORAGE_KEY = "guardian_native_perms_prompted";

/** On Android/iOS shell, request location + SMS + phone permissions once after login. */
export function NativePermissionsBootstrap() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !Capacitor.isNativePlatform()) return;
    ran.current = true;

    const alreadyPrompted =
      typeof window !== "undefined" &&
      sessionStorage.getItem(STORAGE_KEY) === "1";

    (async () => {
      const result = await communicationPermissions.ensureEmergencyPermissions();

      if (!alreadyPrompted) {
        sessionStorage.setItem(STORAGE_KEY, "1");

        const parts = [
          `Location: ${result.location ? "✓" : "✗"}`,
          `SMS: ${result.sms ? "✓" : "✗"}`,
          `Phone: ${result.phone ? "✓" : "✗"}`,
        ];

        if (result.location && result.sms && result.phone) {
          toast.success("Emergency permissions granted", {
            description: parts.join(" · "),
          });
        } else {
          toast.warning("Grant permissions for SOS to work", {
            description: `${parts.join(" · ")} — open Settings → Emergency if prompts were missed.`,
            duration: 8000,
          });
        }
      }
    })();
  }, []);

  return null;
}
