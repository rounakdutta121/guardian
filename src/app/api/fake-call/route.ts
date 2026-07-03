import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { fakeCallService } from "@/lib/services";
import { fakeCallRepo } from "@/lib/repositories";
import { fakeCallSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await requireAuth();
    const calls = await fakeCallRepo.findByUserId(session.user.id);
    return NextResponse.json(calls);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = fakeCallSchema.parse(body);
    const call = await fakeCallService.scheduleCall(session.user.id, {
      callerName: parsed.callerName,
      callerNumber: parsed.callerNumber,
      callerPhotoUrl: parsed.callerPhotoUrl,
      delaySeconds: parsed.delaySeconds,
      ringtone: parsed.ringtone,
      scheduledAt: parsed.scheduledAt
        ? new Date(parsed.scheduledAt)
        : undefined,
    });
    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
