import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import {
  emergencyContactRepo,
  emergencySessionRepo,
  journeyRepo,
  safeCheckinRepo,
  notificationRepo,
  activityLogRepo,
  profileRepo,
} from "@/lib/repositories";

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const [
      contacts,
      activeEmergency,
      activeJourney,
      activeCheckin,
      unreadCount,
      recentActivity,
      profile,
    ] = await Promise.all([
      emergencyContactRepo.findByUserId(userId),
      emergencySessionRepo.findActive(userId),
      journeyRepo.findActive(userId),
      safeCheckinRepo.findActive(userId),
      notificationRepo.getUnreadCount(userId),
      activityLogRepo.findByUserId(userId, { limit: 5 }),
      profileRepo.findByUserId(userId),
    ]);

    return NextResponse.json({
      contacts: contacts.slice(0, 3),
      activeEmergency,
      activeJourney,
      activeCheckin,
      unreadCount,
      recentActivity,
      profile,
      safetyStatus: activeEmergency
        ? "emergency"
        : activeJourney
          ? "tracking"
          : activeCheckin
            ? "checkin"
            : "safe",
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
