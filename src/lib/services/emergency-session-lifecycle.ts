import type { emergencySessions } from "@/lib/db/schema/emergency-sessions";

type EmergencySession = typeof emergencySessions.$inferSelect;

/** Abandoned countdown sessions older than this are auto-cancelled. */
export const EMERGENCY_COUNTDOWN_MAX_AGE_MS = 10 * 60 * 1000;

/** Test SOS sessions auto-close after this. */
export const EMERGENCY_TEST_MAX_AGE_MS = 4 * 60 * 60 * 1000;

/** Real active sessions with no updates auto-resolve after this. */
export const EMERGENCY_ACTIVE_STALE_MS = 12 * 60 * 60 * 1000;

/** Only auto-open fullscreen overlay for sessions started within this window. */
export const EMERGENCY_AUTO_OVERLAY_MAX_AGE_MS = 3 * 60 * 1000;

export function getSessionAgeMs(session: { createdAt: Date | string }): number {
  return Date.now() - new Date(session.createdAt).getTime();
}

export function getSessionIdleMs(session: {
  updatedAt: Date | string;
  createdAt: Date | string;
}): number {
  const updated = new Date(session.updatedAt).getTime();
  const created = new Date(session.createdAt).getTime();
  return Date.now() - Math.max(updated, created);
}

export function shouldAutoExpireSession(session: EmergencySession): boolean {
  const age = getSessionAgeMs(session);
  const idle = getSessionIdleMs(session);

  if (session.status === "countdown" && age > EMERGENCY_COUNTDOWN_MAX_AGE_MS) {
    return true;
  }
  if (session.isTest && session.status === "active" && age > EMERGENCY_TEST_MAX_AGE_MS) {
    return true;
  }
  if (
    !session.isTest &&
    session.status === "active" &&
    idle > EMERGENCY_ACTIVE_STALE_MS
  ) {
    return true;
  }
  return false;
}

export function shouldAutoOpenEmergencyOverlay(session: {
  status: string;
  isTest: boolean;
  createdAt: Date | string;
}): boolean {
  if (session.status === "countdown") {
    return getSessionAgeMs(session) <= EMERGENCY_COUNTDOWN_MAX_AGE_MS;
  }
  if (session.status === "active") {
    return getSessionAgeMs(session) <= EMERGENCY_AUTO_OVERLAY_MAX_AGE_MS;
  }
  return false;
}

export function expireReason(session: EmergencySession): string {
  if (session.status === "countdown") return "countdown_timeout";
  if (session.isTest) return "test_session_expired";
  return "active_session_stale";
}
