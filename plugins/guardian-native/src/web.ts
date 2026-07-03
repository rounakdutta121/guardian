import { WebPlugin } from "@capacitor/core";
import type {
  EmergencyPermissionsResult,
  GuardianNativePlugin,
  PlaceCallResult,
  SendSmsResult,
} from "./definitions";

export class GuardianNativeWeb extends WebPlugin implements GuardianNativePlugin {
  async sendSmsAutomatic(): Promise<SendSmsResult> {
    throw this.unimplemented(
      "Automatic SMS requires the Guardian Android app with SIM permissions."
    );
  }

  async placeCallAutomatic(): Promise<PlaceCallResult> {
    throw this.unimplemented(
      "Automatic calling requires the Guardian native app."
    );
  }

  async requestEmergencyPermissions(): Promise<EmergencyPermissionsResult> {
    return { sms: false, phone: false };
  }
}
