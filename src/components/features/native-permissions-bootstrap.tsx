"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import {
  communicationPermissions,
  isGuardianNativeAvailable,
  requestNativeEmergencyPermissions,
} from "@/lib/communication";

const STORAGE_KEY = "guardian_native_perms_prompted";

/** On Android/iOS shell, request SMS + phone + location after login. */
export function NativePermissionsBootstrap() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !Capacitor.isNativePlatform()) return;
    ran.current = true;

    const alreadyPrompted =
      typeof window !== "undefined" &&
      sessionStorage.getItem(STORAGE_KEY) === "1";

    (async () => {
      if (!isGuardianNativeAvailable()) {
        if (!alreadyPrompted) {
          sessionStorage.setItem(STORAGE_KEY, "1");
          toast.error("Native emergency plugin missing", {
            description:
              "Run: npm run cap:sync → rebuild in Android Studio. SOS dialer/SMS won't work until then.",
            duration: 10000,
          });
        }
        await communicationPermissions.requestLocation();
        return;
      }

      // SMS + phone prompts first (user attention), then location
      const native = await requestNativeEmergencyPermissions();
      const location = await communicationPermissions.requestLocation();

      if (!alreadyPrompted) {
        sessionStorage.setItem(STORAGE_KEY, "1");

        const parts = [
          `SMS: ${native.sms ? "✓" : "✗"}`,
          `Phone: ${native.phone ? "✓" : "✗"}`,
          `Location: ${location ? "✓" : "✗"}`,
        ];

        if (native.sms && native.phone && location) {
          toast.success("Emergency permissions granted", {
            description: parts.join(" · "),
          });
        } else {
          toast.warning("Some permissions missing", {
            description: `${parts.join(" · ")} — Settings → Emergency Information → Grant Emergency Permissions`,
            duration: 10000,
          });
        }
      }
    })();
  }, []);

  return null;
}
