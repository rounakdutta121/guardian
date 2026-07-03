import type { FakeCallWakePayload } from "./types";
import {
  cancelFakeCallLocally,
  clearDeliveredFakeCallNotification,
} from "./local-scheduler";

type ActiveCallSetter = (
  id: string,
  name: string,
  number?: string,
  photoUrl?: string
) => void;

export async function triggerFakeCallOnDevice(
  call: FakeCallWakePayload,
  setActiveCall: ActiveCallSetter
): Promise<boolean> {
  try {
    const res = await fetch(`/api/fake-call/${call.callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trigger" }),
    });
    if (!res.ok) return false;

    setActiveCall(
      call.callId,
      call.callerName,
      call.callerNumber ?? undefined,
      call.callerPhotoUrl ?? undefined
    );

    await clearDeliveredFakeCallNotification(call.callId);
    return true;
  } catch {
    return false;
  }
}

export async function triggerDueFakeCallsFromApi(
  calls: Array<{
    id: string;
    callerName: string;
    callerNumber?: string | null;
    callerPhotoUrl?: string | null;
    status: string;
    scheduledAt: string;
  }>,
  setActiveCall: ActiveCallSetter
): Promise<boolean> {
  const now = Date.now();
  let triggered = false;

  for (const call of calls) {
    if (call.status !== "scheduled") continue;
    if (new Date(call.scheduledAt).getTime() > now) continue;

    const ok = await triggerFakeCallOnDevice(
      {
        callId: call.id,
        callerName: call.callerName,
        callerNumber: call.callerNumber,
        callerPhotoUrl: call.callerPhotoUrl,
      },
      setActiveCall
    );
    if (ok) triggered = true;
  }

  return triggered;
}

export function parseFakeCallExtra(
  extra: Record<string, unknown> | undefined
): FakeCallWakePayload | null {
  if (!extra || extra.kind !== "fake_call") return null;
  const callId = extra.callId;
  const callerName = extra.callerName;
  if (typeof callId !== "string" || typeof callerName !== "string") return null;
  return {
    callId,
    callerName,
    callerNumber:
      typeof extra.callerNumber === "string" ? extra.callerNumber : null,
    callerPhotoUrl:
      typeof extra.callerPhotoUrl === "string" ? extra.callerPhotoUrl : null,
  };
}

export async function cancelFakeCallOnDevice(callId: string): Promise<void> {
  await fetch(`/api/fake-call/${callId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "cancel" }),
  }).catch(() => {});
  await cancelFakeCallLocally(callId);
}
