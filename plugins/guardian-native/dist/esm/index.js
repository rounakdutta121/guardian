import { Capacitor, registerPlugin } from "@capacitor/core";

const GuardianNative = registerPlugin("GuardianNative", {
  web: () => import("./web.js").then((m) => new m.GuardianNativeWeb()),
});

function isGuardianNativeAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("GuardianNative");
}

export { GuardianNative, isGuardianNativeAvailable };
