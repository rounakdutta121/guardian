"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardianNative = void 0;
const core_1 = require("@capacitor/core");
const GuardianNative = (0, core_1.registerPlugin)("GuardianNative", {
    web: () => Promise.resolve().then(() => require("./esm/web")).then((m) => new m.GuardianNativeWeb()),
});
exports.GuardianNative = GuardianNative;
