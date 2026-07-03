import { Capacitor } from "@capacitor/core";
import {
  GuardianNative,
  isGuardianNativeAvailable,
} from "guardian-native";
import { isAndroid, isCapacitorNative, isIOS } from "./platform";

export { isGuardianNativeAvailable };

export async function canUseAutomaticEmergencyComms(): Promise<boolean> {
  if (!isCapacitorNative() || !isGuardianNativeAvailable()) return false;
  try {
    const perms = await GuardianNative.requestEmergencyPermissions();
    return perms.sms || perms.phone;
  } catch {
    return false;
  }
}

export async function requestNativeEmergencyPermissions(): Promise<{
  sms: boolean;
  phone: boolean;
}> {
  if (!isCapacitorNative()) return { sms: false, phone: false };

  if (!isGuardianNativeAvailable()) {
    console.error(
      "[GuardianNative] Plugin not available — rebuild Android app with npm run cap:sync"
    );
    return { sms: false, phone: false };
  }

  try {
    return await GuardianNative.requestEmergencyPermissions();
  } catch (error) {
    console.error("[GuardianNative] Permission request failed:", error);
    return { sms: false, phone: false };
  }
}

export async function sendSmsAutomatic(
  numbers: string[],
  text: string
): Promise<{ sent: number; automatic: boolean } | null> {
  if (!isGuardianNativeAvailable()) return null;

  try {
    if (isAndroid() || isIOS()) {
      const result = await GuardianNative.sendSmsAutomatic({ numbers, text });
      if (result.sent > 0) return result;
    }
  } catch (error) {
    console.warn("[GuardianNative] Automatic SMS failed, trying composer:", error);
  }

  try {
    await GuardianNative.openSmsComposer({ numbers, text });
    return { sent: numbers.length, automatic: false };
  } catch (error) {
    console.error("[GuardianNative] SMS composer failed:", error);
    return null;
  }
}

export async function placeCallAutomatic(
  number: string
): Promise<{ placed: boolean; automatic: boolean } | null> {
  if (!isGuardianNativeAvailable()) return null;

  try {
    const result = await GuardianNative.placeCallAutomatic({ number });
    if (result.placed) return result;
  } catch (error) {
    console.warn("[GuardianNative] Automatic call failed, trying dialer:", error);
  }

  try {
    await GuardianNative.openDialer({ number });
    return { placed: true, automatic: false };
  } catch (error) {
    console.error("[GuardianNative] Dialer failed:", error);
    return null;
  }
}

export async function openSmsComposer(
  numbers: string[],
  text: string
): Promise<boolean> {
  if (!isGuardianNativeAvailable()) return false;
  try {
    await GuardianNative.openSmsComposer({ numbers, text });
    return true;
  } catch {
    return false;
  }
}

export async function openDialer(number: string): Promise<boolean> {
  if (!isGuardianNativeAvailable()) return false;
  try {
    await GuardianNative.openDialer({ number });
    return true;
  } catch {
    return false;
  }
}
