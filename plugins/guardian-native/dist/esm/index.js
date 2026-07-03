import { registerPlugin } from "@capacitor/core";

const GuardianNative = registerPlugin("GuardianNative", {
  web: () => import("./web.js").then((m) => new m.GuardianNativeWeb()),
});

export { GuardianNative };
