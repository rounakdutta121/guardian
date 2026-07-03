import type { EmergencyContactTarget, CallResult } from "./types";
import {
  isCapacitorNative,
  isMobileDevice,
  normalizePhoneForNative,
  openNativeUrl,
} from "./platform";
import { placeCallAutomatic } from "./native-bridge";

export class NativePhoneService {
  selectPrimaryContact(
    contacts: EmergencyContactTarget[]
  ): EmergencyContactTarget | null {
    const sosContacts = contacts.filter((c) => c.notifyOnSos);
    if (sosContacts.length === 0) return null;

    const sorted = [...sosContacts].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return a.priority - b.priority;
    });

    return sorted[0];
  }

  async call(phone: string): Promise<CallResult> {
    if (!isMobileDevice()) {
      return {
        success: false,
        method: "skipped",
        phone,
        error: "PLATFORM_LIMITATION",
        errorMessage:
          "Phone calls require a mobile device with a SIM card.",
      };
    }

    const normalized = normalizePhoneForNative(phone);

    if (isCapacitorNative()) {
      const result = await placeCallAutomatic(normalized);
      if (result?.placed) {
        return {
          success: true,
          method: "automatic",
          phone: normalized,
        };
      }
    }

    try {
      await openNativeUrl(`tel:${normalized}`);
      return {
        success: true,
        method: "native_dialer",
        phone: normalized,
      };
    } catch (error) {
      return {
        success: false,
        method: "skipped",
        phone,
        error: "UNKNOWN",
        errorMessage:
          error instanceof Error ? error.message : "Failed to open phone app",
      };
    }
  }

  async callPrimaryContact(
    contacts: EmergencyContactTarget[]
  ): Promise<CallResult> {
    const primary = this.selectPrimaryContact(contacts);
    if (!primary) {
      return {
        success: false,
        method: "skipped",
        error: "NO_CONTACTS",
        errorMessage: "No emergency contacts configured for SOS.",
      };
    }

    const result = await this.call(primary.phone);
    return {
      ...result,
      contactName: primary.name,
      phone: primary.phone,
    };
  }
}

export const nativePhoneService = new NativePhoneService();
