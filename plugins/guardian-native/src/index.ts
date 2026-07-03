import { Capacitor, registerPlugin } from "@capacitor/core";
import type { GuardianNativePlugin } from "./definitions";

export const GuardianNative = registerPlugin<GuardianNativePlugin>("GuardianNative", {
  web: () => import("./web").then((m) => new m.GuardianNativeWeb()),
});

export function isGuardianNativeAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("GuardianNative");
}

export * from "./definitions";
export { GuardianNative as default };
