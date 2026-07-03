import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { emergencyEngine } from "@/lib/services";
import { emergencySessionRepo } from "@/lib/repositories";
import { emergencyTriggerSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await requireAuth();
    await emergencyEngine.expireStaleSessions(session.user.id);
    const sessions = await emergencySessionRepo.findByUserId(session.user.id);
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = emergencyTriggerSchema.parse(body);
    const emergencySession = await emergencyEngine.startEmergency(
      session.user.id,
      parsed
    );
    return NextResponse.json(emergencySession, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const session = await requireAuth();
    const closed = await emergencyEngine.closeAllOpenSessions(session.user.id);
    return NextResponse.json({ closed });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
