import { buildEmergencySmsMessage } from "./message-builder";
import {
  delay,
  isAndroid,
  isCapacitorNative,
  isIOS,
  isMobileDevice,
  normalizePhoneForNative,
  openNativeUrl,
} from "./platform";
import {
  placeCallAutomatic,
  sendSmsAutomatic,
} from "./native-bridge";
import type { SmsSendResult } from "./types";

function buildSmsUrl(phone: string, message: string): string {
  const encoded = encodeURIComponent(message);
  const normalized = normalizePhoneForNative(phone);
  if (isIOS()) {
    return `sms:${normalized}&body=${encoded}`;
  }
  return `sms:${normalized}?body=${encoded}`;
}

function buildMultiRecipientSmsUrl(phones: string[], message: string): string {
  const encoded = encodeURIComponent(message);
  const normalized = phones.map(normalizePhoneForNative).join(",");
  if (isIOS()) {
    return buildSmsUrl(phones[0], message);
  }
  return `sms:${normalized}?body=${encoded}`;
}

export class NativeSmsService {
  /** Try automatic send via native SIM (Android). Falls back to SMS composer. */
  async sendAutomatic(
    phones: string[],
    message: string
  ): Promise<SmsSendResult[]> {
    if (phones.length === 0) return [];

    const normalized = phones.map(normalizePhoneForNative);

    if (isCapacitorNative()) {
      const result = await sendSmsAutomatic(normalized, message);
      if (result && result.sent > 0) {
        return phones.map((phone) => ({
          phone,
          success: true,
          method: "automatic" as const,
        }));
      }
    }

    return this.sendToAllComposer(phones, message);
  }

  async send(phone: string, message: string): Promise<SmsSendResult> {
    if (!isMobileDevice()) {
      return {
        phone,
        success: false,
        method: "skipped",
        error: "PLATFORM_LIMITATION",
        errorMessage: "SMS requires a mobile device with a SIM card.",
      };
    }

    if (isCapacitorNative() && isAndroid()) {
      const result = await sendSmsAutomatic([normalizePhoneForNative(phone)], message);
      if (result && result.sent > 0) {
        return { phone, success: true, method: "automatic" };
      }
    }

    try {
      await openNativeUrl(buildSmsUrl(phone, message));
      return { phone, success: true, method: "native_composer" };
    } catch (error) {
      return {
        phone,
        success: false,
        method: "skipped",
        error: "UNKNOWN",
        errorMessage:
          error instanceof Error ? error.message : "Failed to open SMS app",
      };
    }
  }

  private async sendToAllComposer(
    phones: string[],
    message: string
  ): Promise<SmsSendResult[]> {
    if (isAndroid() && phones.length > 1) {
      try {
        await openNativeUrl(buildMultiRecipientSmsUrl(phones, message));
        return phones.map((phone) => ({
          phone,
          success: true,
          method: "native_composer" as const,
        }));
      } catch {
        // fall through
      }
    }

    const results: SmsSendResult[] = [];
    for (const phone of phones) {
      results.push(await this.send(phone, message));
      if (phones.length > 1) {
        await delay(isIOS() ? 800 : 400);
      }
    }
    return results;
  }

  async sendToAll(phones: string[], message: string): Promise<SmsSendResult[]> {
    return this.sendAutomatic(phones, message);
  }

  async sendEmergencySms(
    phones: string[],
    context: Parameters<typeof buildEmergencySmsMessage>[0]
  ): Promise<SmsSendResult[]> {
    const message = buildEmergencySmsMessage(context);
    return this.sendAutomatic(phones, message);
  }
}

export const nativeSmsService = new NativeSmsService();
