import { Capacitor } from "@capacitor/core";
import { isAndroid, isCapacitorNative, isIOS } from "./platform";

type GuardianNativeModule = {
  sendSmsAutomatic(options: {
    numbers: string[];
    text: string;
  }): Promise<{ sent: number; automatic: boolean }>;
  placeCallAutomatic(options: {
    number: string;
  }): Promise<{ placed: boolean; automatic: boolean }>;
  requestEmergencyPermissions(): Promise<{ sms: boolean; phone: boolean }>;
};

let pluginPromise: Promise<GuardianNativeModule | null> | null = null;

async function loadPlugin(): Promise<GuardianNativeModule | null> {
  if (!isCapacitorNative()) return null;
  if (!pluginPromise) {
    pluginPromise = import("guardian-native")
      .then((m) => m.GuardianNative as GuardianNativeModule)
      .catch(() => null);
  }
  return pluginPromise;
}

export async function canUseAutomaticEmergencyComms(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const plugin = await loadPlugin();
  return plugin != null;
}

export async function requestNativeEmergencyPermissions(): Promise<{
  sms: boolean;
  phone: boolean;
}> {
  const plugin = await loadPlugin();
  if (!plugin) return { sms: false, phone: false };
  try {
    return await plugin.requestEmergencyPermissions();
  } catch {
    return { sms: false, phone: false };
  }
}

export async function sendSmsAutomatic(
  numbers: string[],
  text: string
): Promise<{ sent: number; automatic: boolean } | null> {
  const plugin = await loadPlugin();
  if (!plugin) return null;

  try {
    if (isAndroid()) {
      return await plugin.sendSmsAutomatic({ numbers, text });
    }
    if (isIOS() && numbers.length > 0) {
      return await plugin.sendSmsAutomatic({ numbers, text });
    }
  } catch {
    return null;
  }
  return null;
}

export async function placeCallAutomatic(
  number: string
): Promise<{ placed: boolean; automatic: boolean } | null> {
  const plugin = await loadPlugin();
  if (!plugin) return null;

  try {
    return await plugin.placeCallAutomatic({ number });
  } catch {
    return null;
  }
}
