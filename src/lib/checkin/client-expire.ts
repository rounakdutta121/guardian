import { toast } from "sonner";
import { useLocationStore } from "@/stores";
import { getBatteryLevel } from "@/lib/location/helpers";
import { generateMapsUrl } from "@/lib/utils";
import {
  emergencyCommunicationService,
  emergencyLocationTracker,
  communicationPermissions,
  isGuardianNativeAvailable,
} from "@/lib/communication";
import {
  refreshLocationForEscalation,
  wasNativeCheckinEscalationExecuted,
  cancelCheckinAlarmsOnly,
  clearCheckinBackgroundEscalation,
  runStoredNativeCheckinEscalation,
} from "@/lib/checkin/native-scheduler";

export type CheckinEscalationReason = "checkin_need_help" | "checkin_missed";

const expiringCheckinIds = new Set<string>();
const PENDING_ESCALATION_KEY = "guardian-pending-checkin-escalation";

type PendingEscalation = {
  sessionId: string;
  reason: CheckinEscalationReason;
};

function savePendingEscalation(pending: PendingEscalation) {
  try {
    sessionStorage.setItem(PENDING_ESCALATION_KEY, JSON.stringify(pending));
  } catch {
    // ignore
  }
}

function clearPendingEscalation() {
  try {
    sessionStorage.removeItem(PENDING_ESCALATION_KEY);
  } catch {
    // ignore
  }
}

export function getPendingEscalation(): PendingEscalation | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ESCALATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingEscalation;
  } catch {
    return null;
  }
}

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
): Promise<boolean> {
  savePendingEscalation({ sessionId: session.id, reason });

  await refreshLocationForEscalation();

  const perms = await communicationPermissions.ensureEmergencyPermissions();
  if (!perms.sms && !perms.phone) {
    toast.error(
      isGuardianNativeAvailable()
        ? "SMS/Phone permission required — enable in Settings"
        : "Rebuild the Android app for emergency SMS and calls"
    );
  }

  await activateEmergencySession(session.id);

  const { latitude, longitude } = useLocationStore.getState();
  const battery = await getBatteryLevel();
  const mapsUrl =
    latitude && longitude ? generateMapsUrl(latitude, longitude) : null;

  try {
    const result = await emergencyCommunicationService.executeEmergencyCommunications({
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

    const smsOk = result.sms.some((s) => s.success);
    const callOk = result.calls.some((c) => c.success);

    if (result.sms.length === 0 && result.calls.length === 0) {
      toast.error("No emergency contacts — add at least one contact first");
      return false;
    }

    if (!smsOk && !callOk) {
      toast.error("Could not reach contacts — check SMS and phone permissions");
      return false;
    }

    clearPendingEscalation();

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

    return true;
  } catch (error) {
    console.error("[Checkin] Escalation failed:", error);
    toast.error("Failed to alert contacts — will retry when app is active");
    return false;
  }
}

export async function retryPendingCheckinEscalation(): Promise<void> {
  const pending = getPendingEscalation();
  if (!pending) return;
  await runCheckinEscalation(
    { id: pending.sessionId },
    pending.reason
  );
}

export async function expireCheckinOnClient(
  checkinId: string,
  options?: { skipEscalation?: boolean }
): Promise<{
  emergencySession: { id: string } | null;
}> {
  if (expiringCheckinIds.has(checkinId)) {
    return { emergencySession: null };
  }
  expiringCheckinIds.add(checkinId);

  try {
    const nativeAlreadyQueued = await runStoredNativeCheckinEscalation(checkinId);
    await cancelCheckinAlarmsOnly(checkinId);
    await refreshLocationForEscalation();
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

    const nativeAlreadyRan =
      nativeAlreadyQueued || (await wasNativeCheckinEscalationExecuted(checkinId));

    if (emergencySession?.id && !options?.skipEscalation && !nativeAlreadyRan) {
      await runCheckinEscalation(emergencySession, "checkin_missed");
    } else if (nativeAlreadyRan && emergencySession?.id) {
      clearPendingEscalation();
      emergencyLocationTracker.start(
        emergencySession.id,
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

    if (nativeAlreadyRan || emergencySession?.id) {
      await clearCheckinBackgroundEscalation(checkinId);
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
