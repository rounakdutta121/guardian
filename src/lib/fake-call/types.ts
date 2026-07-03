export type ScheduledFakeCall = {
  id: string;
  callerName: string;
  callerNumber?: string | null;
  callerPhotoUrl?: string | null;
  ringtone?: string | null;
  scheduledAt: string;
  status: string;
};

export type FakeCallWakePayload = {
  callId: string;
  callerName: string;
  callerNumber?: string | null;
  callerPhotoUrl?: string | null;
};

export const FAKE_CALL_CHANNEL_ID = "guardian_fake_calls";

/** Stable positive int for Android local notification / alarm ids. */
export function callIdToNotificationId(callId: string): number {
  let hash = 0;
  for (let i = 0; i < callId.length; i++) {
    hash = (hash << 5) - hash + callId.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 2_000_000_000) + 1;
}
