import { WebPlugin } from "@capacitor/core";
export class GuardianNativeWeb extends WebPlugin {
    async sendSmsAutomatic() {
        throw this.unimplemented("Automatic SMS requires the Guardian Android app with SIM permissions.");
    }
    async placeCallAutomatic() {
        throw this.unimplemented("Automatic calling requires the Guardian native app.");
    }
    async requestEmergencyPermissions() {
        return { sms: false, phone: false };
    }
}
