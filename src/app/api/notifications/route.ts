import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { notificationRepo } from "@/lib/repositories";

export async function GET() {
  try {
    const session = await requireAuth();
    const notifications = await notificationRepo.findByUserId(session.user.id);
    const unreadCount = await notificationRepo.getUnreadCount(session.user.id);
    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { action, id } = body as { action: string; id?: string };

    if (action === "read_all") {
      await notificationRepo.markAllAsRead(session.user.id);
      return NextResponse.json({ success: true });
    }

    if (action === "read" && id) {
      const notification = await notificationRepo.markAsRead(
        id,
        session.user.id
      );
      return NextResponse.json(notification);
    }

    if (action === "delete" && id) {
      await notificationRepo.softDelete(id, session.user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
