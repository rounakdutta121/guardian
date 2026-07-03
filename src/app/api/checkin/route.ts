import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { safeCheckinService } from "@/lib/services";
import { safeCheckinRepo } from "@/lib/repositories";
import { safeCheckinSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await requireAuth();
    const checkins = await safeCheckinRepo.findByUserId(session.user.id);
    return NextResponse.json(checkins);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = safeCheckinSchema.parse(body);
    const checkin = await safeCheckinService.createCheckin(
      session.user.id,
      parsed.durationMinutes,
      parsed.message,
      parsed.notifyContacts
    );
    return NextResponse.json(checkin, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
