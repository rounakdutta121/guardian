import { Geolocation } from "@capacitor/geolocation";
import { useLocationStore } from "@/stores";
import { getBatteryLevel } from "@/lib/location/helpers";
import { generateMapsUrl } from "@/lib/utils";
import { buildEmergencySmsMessage } from "@/lib/communication/message-builder";
import {
  filterContactsForMode,
  sortContactsForEscalation,
} from "@/lib/communication/contact-priority";
import type { EmergencyContactTarget } from "@/lib/communication/types";
import { isCapacitorNative } from "@/lib/communication/platform";
import { GuardianNative, isGuardianNativeAvailable } from "guardian-native";
import { LocalNotifications } from "@capacitor/local-notifications";
import { ensureFakeCallNotificationPermissions } from "@/lib/fake-call/local-scheduler";
import {
  CHECKIN_CHANNEL_ID,
  checkinIdToNotificationId,
  type ActiveCheckinSchedule,
  type CheckinContactPayload,
} from "./types";

let channelReady = false;

async function ensureCheckinChannel(): Promise<void> {
  if (!isCapacitorNative() || channelReady) return;
  try {
    await LocalNotifications.createChannel({
      id: CHECKIN_CHANNEL_ID,
      name: "Safe check-in alerts",
      description: "Alerts when a safe check-in timer expires",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: "#f59e0b",
    });
    channelReady = true;
  } catch {
    channelReady = true;
  }
}

export async function refreshLocationForEscalation(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
    });
    useLocationStore
      .getState()
      .setLocation(
        position.coords.latitude,
        position.coords.longitude,
        position.coords.accuracy
      );
  } catch {
    // Use last known location from store if available
  }
}

async function fetchCheckinContacts(): Promise<CheckinContactPayload[]> {
  const res = await fetch("/api/emergency-contacts");
  if (!res.ok) return [];
  const all = (await res.json()) as EmergencyContactTarget[];
  return sortContactsForEscalation(filterContactsForMode(all, "checkin")).map(
    (c) => ({ name: c.name, phone: c.phone })
  );
}

async function buildCheckinMissedMessage(): Promise<string> {
  await refreshLocationForEscalation();
  const { latitude, longitude } = useLocationStore.getState();
  const battery = await getBatteryLevel();
  const mapsUrl =
    latitude && longitude ? generateMapsUrl(latitude, longitude) : null;

  return buildEmergencySmsMessage({
    mapsUrl,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    batteryLevel: battery,
    reason: "checkin_missed",
  });
}

export async function scheduleCheckinBackgroundEscalation(
  checkin: ActiveCheckinSchedule
): Promise<void> {
  if (!isCapacitorNative() || !checkin.notifyContacts || checkin.status !== "active") {
    return;
  }

  const expiresAt = new Date(checkin.expiresAt);
  if (expiresAt.getTime() <= Date.now()) return;

  const contacts = await fetchCheckinContacts();
  if (contacts.length === 0) return;

  await ensureFakeCallNotificationPermissions();
  await ensureCheckinChannel();

  const notificationId = checkinIdToNotificationId(checkin.id);
  const message = await buildCheckinMissedMessage();

  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
  } catch {
    // ignore
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId,
        title: "Check-in missed",
        body: "Safe check-in expired — alerting your contacts",
        channelId: CHECKIN_CHANNEL_ID,
        schedule: {
          at: expiresAt,
          allowWhileIdle: true,
        },
        ongoing: true,
        autoCancel: false,
        extra: {
          kind: "checkin_expire",
          checkinId: checkin.id,
        },
      },
    ],
  });

  if (isGuardianNativeAvailable()) {
    try {
      await GuardianNative.scheduleCheckinEscalation({
        notificationId,
        checkinId: checkin.id,
        triggerAt: expiresAt.getTime(),
        message,
        contacts,
      });
    } catch (error) {
      console.error("[Checkin] Native escalation schedule failed:", error);
    }
  }
}

export async function cancelCheckinBackgroundEscalation(
  checkinId: string
): Promise<void> {
  if (!isCapacitorNative()) return;

  const notificationId = checkinIdToNotificationId(checkinId);

  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
  } catch {
    // ignore
  }

  if (isGuardianNativeAvailable()) {
    try {
      await GuardianNative.cancelCheckinEscalation({
        checkinId,
        notificationId,
      });
    } catch {
      // ignore
    }
  }
}

export async function syncActiveCheckinSchedules(
  checkins: ActiveCheckinSchedule[]
): Promise<void> {
  if (!isCapacitorNative()) return;

  const active = checkins.find((c) => c.status === "active");
  if (!active?.notifyContacts) return;
  await scheduleCheckinBackgroundEscalation(active);
}

export async function wasNativeCheckinEscalationExecuted(
  checkinId: string
): Promise<boolean> {
  if (!isGuardianNativeAvailable()) return false;
  try {
    const result = await GuardianNative.wasCheckinEscalationExecuted({
      checkinId,
    });
    return Boolean(result.executed);
  } catch {
    return false;
  }
}
