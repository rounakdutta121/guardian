import { Capacitor } from "@capacitor/core";

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): "web" | "ios" | "android" | "unknown" {
  if (!isBrowser()) return "unknown";
  const platform = Capacitor.getPlatform();
  if (platform === "ios") return "ios";
  if (platform === "android") return "android";
  return "web";
}

export function isIOS(): boolean {
  return getPlatform() === "ios";
}

export function isAndroid(): boolean {
  return getPlatform() === "android";
}

export function isMobileDevice(): boolean {
  if (!isBrowser()) return false;
  return (
    isCapacitorNative() ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );
}

export function normalizePhoneForNative(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export async function openNativeUrl(url: string): Promise<void> {
  if (!isBrowser()) return;

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isAirplaneModeLikely(): boolean {
  if (!isBrowser()) return false;
  return !navigator.onLine;
}
