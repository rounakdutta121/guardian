"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { isCapacitorNative } from "@/lib/communication/platform";

const LOCK_CLASS = "guardian-fake-call-lock";

/**
 * On native app: block scrolling, history back, and hardware back while active.
 */
export function useNativeFullscreenLock(active: boolean) {
  useEffect(() => {
    if (!active || !isCapacitorNative()) return;

    const html = document.documentElement;
    const body = document.body;

    html.classList.add(LOCK_CLASS);
    body.classList.add(LOCK_CLASS);

    const previousOverflow = body.style.overflow;
    const previousTouchAction = body.style.touchAction;
    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    const blockPopState = () => {
      window.history.pushState({ guardianFakeCall: true }, "");
    };
    window.history.pushState({ guardianFakeCall: true }, "");
    window.addEventListener("popstate", blockPopState);

    let backListener: { remove: () => void } | null = null;
    void App.addListener("backButton", () => {
      // Consume back — user must answer or decline the fake call.
    }).then((handle) => {
      backListener = handle;
    });

    return () => {
      html.classList.remove(LOCK_CLASS);
      body.classList.remove(LOCK_CLASS);
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
      window.removeEventListener("popstate", blockPopState);
      backListener?.remove();
    };
  }, [active]);
}
