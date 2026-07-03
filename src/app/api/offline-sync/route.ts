import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { offlineSyncService } from "@/lib/services";

export async function GET() {
  try {
    const session = await requireAuth();
    const results = await offlineSyncService.processQueue(session.user.id);
    return NextResponse.json({ processed: results });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { action, payload } = body as {
      action: string;
      payload: Record<string, unknown>;
    };
    const item = await offlineSyncService.queueAction(
      session.user.id,
      action,
      payload
    );
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
