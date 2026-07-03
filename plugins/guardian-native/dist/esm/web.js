import { WebPlugin } from "@capacitor/core";

export class GuardianNativeWeb extends WebPlugin {
    async sendSmsAutomatic() {
        throw this.unimplemented("Automatic SMS requires the Guardian Android app with SIM permissions.");
    }
    async placeCallAutomatic() {
        throw this.unimplemented("Automatic calling requires the Guardian native app.");
    }
    async openSmsComposer() {
        throw this.unimplemented("SMS composer requires the Guardian Android app.");
    }
    async openDialer() {
        throw this.unimplemented("Dialer requires the Guardian Android app.");
    }
    async requestEmergencyPermissions() {
        return { sms: false, phone: false };
    }
    async scheduleFakeCallWake() {
        return { scheduled: false };
    }
    async cancelFakeCallWake() {
        return { cancelled: false };
    }
    async consumePendingFakeCallWake() {
        return null;
    }
}
