import { registerPlugin } from "@capacitor/core";
import type { GuardianNativePlugin } from "./definitions";

const GuardianNative = registerPlugin<GuardianNativePlugin>("GuardianNative", {
  web: () => import("./web").then((m) => new m.GuardianNativeWeb()),
});

export * from "./definitions";
export { GuardianNative };
