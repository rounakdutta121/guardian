import { useLocationStore } from "@/stores";
import { getBatteryLevel } from "@/lib/location/helpers";
import { generateMapsUrl } from "@/lib/utils";
import {
  emergencyCommunicationService,
  emergencyLocationTracker,
  communicationPermissions,
  isGuardianNativeAvailable,
} from "@/lib/communication";

export type CheckinEscalationReason = "checkin_need_help" | "checkin_missed";

const expiringCheckinIds = new Set<string>();

async function activateEmergencySession(sessionId: string): Promise<void> {
  try {
    await fetch(`/api/emergency/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate" }),
    });
  } catch {
    // Session may already be active (e.g. safe_checkin)
  }
}

export async function runCheckinEscalation(
  session: { id: string },
  reason: CheckinEscalationReason
): Promise<void> {
  const perms = await communicationPermissions.ensureEmergencyPermissions();
  if (!perms.sms && !perms.phone) {
    console.warn(
      isGuardianNativeAvailable()
        ? "SMS/Phone permissions denied for check-in escalation"
        : "Native plugin unavailable for check-in escalation"
    );
  }

  await activateEmergencySession(session.id);

  const { latitude, longitude } = useLocationStore.getState();
  const battery = await getBatteryLevel();
  const mapsUrl =
    latitude && longitude ? generateMapsUrl(latitude, longitude) : null;

  await emergencyCommunicationService.executeEmergencyCommunications({
    sessionId: session.id,
    isTest: false,
    mode: "checkin",
    context: {
      mapsUrl,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      batteryLevel: battery,
      reason,
    },
  });

  emergencyLocationTracker.start(
    session.id,
    () => {
      const loc = useLocationStore.getState();
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
      };
    },
    getBatteryLevel
  );
}

export async function expireCheckinOnClient(checkinId: string): Promise<{
  emergencySession: { id: string } | null;
}> {
  if (expiringCheckinIds.has(checkinId)) {
    return { emergencySession: null };
  }
  expiringCheckinIds.add(checkinId);

  try {
    const { latitude, longitude, accuracy } = useLocationStore.getState();
    const battery = await getBatteryLevel();

    const res = await fetch(`/api/checkin/${checkinId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "expire",
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        accuracy: accuracy ?? undefined,
        batteryLevel: battery ?? undefined,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to expire check-in");
    }

    const data = await res.json();
    const emergencySession = data.emergencySession ?? null;

    if (emergencySession?.id) {
      await runCheckinEscalation(emergencySession, "checkin_missed");
    }

    return { emergencySession };
  } finally {
    expiringCheckinIds.delete(checkinId);
  }
}

export function getCheckinRemainingMs(checkin: {
  expiresAt: string;
}): number {
  return Math.max(0, new Date(checkin.expiresAt).getTime() - Date.now());
}

export function formatCheckinRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
