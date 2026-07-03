import { Geolocation } from "@capacitor/geolocation";
import type { CommunicationPermission, DeviceCapabilityReport } from "./types";
import {
  getPlatform,
  isAirplaneModeLikely,
  isAndroid,
  isBrowser,
  isCapacitorNative,
  isIOS,
  isMobileDevice,
} from "./platform";
import { requestNativeEmergencyPermissions } from "./native-bridge";

export const PERMISSION_EXPLANATIONS: Record<
  CommunicationPermission,
  { title: string; description: string; settingsHint: string }
> = {
  location: {
    title: "Location Access",
    description:
      "Guardian needs your location to share your position with emergency contacts during an SOS.",
    settingsHint: "Enable Location in your device Settings → Guardian → Permissions.",
  },
  backgroundLocation: {
    title: "Background Location",
    description:
      "Allows Guardian to keep tracking your location during an active emergency, even when the app is in the background.",
    settingsHint:
      "Set Location to 'Allow all the time' in Settings → Guardian → Permissions.",
  },
  phone: {
    title: "Phone Access",
    description:
      "Guardian automatically calls your primary emergency contact using your SIM card during SOS — no manual dialing needed on Android.",
    settingsHint:
      "Grant Phone permission when prompted. On Android, calls start automatically.",
  },
  sms: {
    title: "SMS Access",
    description:
      "Guardian automatically sends emergency SMS to all contacts from your SIM during SOS — no typing needed on Android.",
    settingsHint:
      "Grant SMS permission when prompted. Messages use your carrier, not any third-party service.",
  },
  notifications: {
    title: "Notifications",
    description:
      "Receive alerts for check-ins, journey updates, and emergency status changes.",
    settingsHint: "Enable notifications in Settings → Guardian → Notifications.",
  },
};

export class CommunicationPermissionsService {
  getExplanation(permission: CommunicationPermission) {
    return PERMISSION_EXPLANATIONS[permission];
  }

  async getDeviceCapabilities(): Promise<DeviceCapabilityReport> {
    const platform = getPlatform();
    const limitations: string[] = [];
    const isOnline = isBrowser() ? navigator.onLine : true;
    const airplaneMode = isAirplaneModeLikely();

    if (!isMobileDevice()) {
      limitations.push(
        "SMS and phone calls require a mobile device with a SIM card."
      );
    }

    if (isIOS()) {
      limitations.push(
        "iOS requires one tap to confirm SMS send — Apple does not allow fully silent SMS."
      );
      limitations.push(
        "iOS may show a brief confirmation before placing an emergency call."
      );
    }

    if (isAndroid() && isCapacitorNative()) {
      limitations.push(
        "Android: SMS and calls are sent automatically when SMS and Phone permissions are granted."
      );
    }

    if (airplaneMode) {
      limitations.push("Airplane mode detected — SMS may queue until signal returns.");
    }

    return {
      canSendSms: isMobileDevice(),
      canMakeCalls: isMobileDevice(),
      canAutoSendSms: isCapacitorNative() && isAndroid(),
      canAutoCall: isCapacitorNative(),
      hasLocation:
        isCapacitorNative() ||
        (isBrowser() && "geolocation" in navigator),
      isOnline,
      airplaneMode,
      platform,
      limitations,
    };
  }

  async requestLocation(): Promise<boolean> {
    try {
      if (isCapacitorNative()) {
        const status = await Geolocation.checkPermissions();
        if (status.location !== "granted") {
          const result = await Geolocation.requestPermissions({
            permissions: ["location"],
          });
          if (result.location !== "granted") return false;
        }
        await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        return true;
      }

      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { enableHighAccuracy: true, timeout: 15000 }
        );
      });
    } catch {
      return false;
    }
  }

  async requestBackgroundLocation(): Promise<boolean> {
    const granted = await this.requestLocation();
    if (!granted) return false;

    if (isCapacitorNative() && isAndroid()) {
      try {
        const result = await Geolocation.requestPermissions({
          permissions: ["location", "coarseLocation"],
        });
        return result.location === "granted";
      } catch {
        return granted;
      }
    }

    return granted;
  }

  async ensureEmergencyPermissions(): Promise<{
    location: boolean;
    sms: boolean;
    phone: boolean;
  }> {
    const caps = await this.getDeviceCapabilities();
    const location = caps.hasLocation ? await this.requestLocation() : false;

    let sms = false;
    let phone = false;

    if (isCapacitorNative()) {
      const native = await requestNativeEmergencyPermissions();
      sms = native.sms;
      phone = native.phone;
    } else {
      sms = caps.canSendSms;
      phone = caps.canMakeCalls;
    }

    return { location, sms, phone };
  }
}

export const communicationPermissions = new CommunicationPermissionsService();
