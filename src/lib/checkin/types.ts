export const CHECKIN_CHANNEL_ID = "guardian_checkin_alerts";

export type CheckinContactPayload = {
  name: string;
  phone: string;
};

export type ActiveCheckinSchedule = {
  id: string;
  expiresAt: string;
  notifyContacts: boolean;
  status: string;
};

/** Stable positive int for Android notification / alarm ids. */
export function checkinIdToNotificationId(checkinId: string): number {
  let hash = 5381;
  for (let i = 0; i < checkinId.length; i++) {
    hash = (hash * 33) ^ checkinId.charCodeAt(i);
  }
  return (Math.abs(hash) % 2_000_000_000) + 10_000;
}
