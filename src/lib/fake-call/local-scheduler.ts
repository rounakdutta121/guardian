import { LocalNotifications } from "@capacitor/local-notifications";
import { isCapacitorNative } from "@/lib/communication/platform";
import { GuardianNative, isGuardianNativeAvailable } from "guardian-native";
import {
  callIdToNotificationId,
  FAKE_CALL_CHANNEL_ID,
  type ScheduledFakeCall,
} from "./types";

let channelReady = false;

async function ensureFakeCallChannel(): Promise<void> {
  if (!isCapacitorNative() || channelReady) return;

  try {
    await LocalNotifications.createChannel({
      id: FAKE_CALL_CHANNEL_ID,
      name: "Incoming fake calls",
      description: "Rings when a scheduled fake call is due",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: "#7c3aed",
    });
    channelReady = true;
  } catch {
    channelReady = true;
  }
}

export async function ensureFakeCallNotificationPermissions(): Promise<boolean> {
  if (!isCapacitorNative()) return false;

  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === "granted";
  } catch {
    return false;
  }
}

async function ensureExactAlarmPermission(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const setting = await LocalNotifications.checkExactNotificationSetting();
    if (setting.exact_alarm === "granted") return;
    await LocalNotifications.changeExactNotificationSetting();
  } catch {
    // Not available on all platforms / OS versions
  }
}

export async function scheduleFakeCallLocally(call: ScheduledFakeCall): Promise<void> {
  if (!isCapacitorNative() || call.status !== "scheduled") return;

  const scheduledAt = new Date(call.scheduledAt);
  if (scheduledAt.getTime() <= Date.now()) return;

  await ensureFakeCallNotificationPermissions();
  await ensureExactAlarmPermission();
  await ensureFakeCallChannel();

  const notificationId = callIdToNotificationId(call.id);

  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
  } catch {
    // ignore
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId,
        title: "Incoming call",
        body: `${call.callerName} is calling…`,
        channelId: FAKE_CALL_CHANNEL_ID,
        schedule: {
          at: scheduledAt,
          allowWhileIdle: true,
        },
        ongoing: true,
        autoCancel: false,
        extra: {
          kind: "fake_call",
          callId: call.id,
          callerName: call.callerName,
          callerNumber: call.callerNumber ?? null,
          callerPhotoUrl: call.callerPhotoUrl ?? null,
        },
      },
    ],
  });

  if (isGuardianNativeAvailable()) {
    try {
      await GuardianNative.scheduleFakeCallWake({
        notificationId,
        callId: call.id,
        callerName: call.callerName,
        callerNumber: call.callerNumber ?? undefined,
        callerPhotoUrl: call.callerPhotoUrl ?? undefined,
        triggerAt: scheduledAt.getTime(),
      });
    } catch {
      // Local notification still fires if native wake fails
    }
  }
}

export async function cancelFakeCallLocally(callId: string): Promise<void> {
  if (!isCapacitorNative()) return;

  const notificationId = callIdToNotificationId(callId);

  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
  } catch {
    // ignore
  }

  if (isGuardianNativeAvailable()) {
    try {
      await GuardianNative.cancelFakeCallWake({ notificationId });
    } catch {
      // ignore
    }
  }
}

export async function syncScheduledFakeCalls(calls: ScheduledFakeCall[]): Promise<void> {
  if (!isCapacitorNative()) return;

  const scheduled = calls.filter((c) => c.status === "scheduled");
  for (const call of scheduled) {
    await scheduleFakeCallLocally(call);
  }
}

export async function clearDeliveredFakeCallNotification(
  callId: string
): Promise<void> {
  if (!isCapacitorNative()) return;
  const id = callIdToNotificationId(callId);
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    // ignore
  }
}
