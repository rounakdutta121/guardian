import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { fakeCallService } from "@/lib/services";
import { fakeCallRepo } from "@/lib/repositories";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action: string };

    let result;
    switch (action) {
      case "trigger":
        result = await fakeCallService.triggerCall(id, session.user.id);
        break;
      case "answer":
        result = await fakeCallService.answerCall(id, session.user.id);
        break;
      case "cancel":
        result = await fakeCallService.cancelCall(id, session.user.id);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    const status = message === "Not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const call = await fakeCallRepo.findById(id, session.user.id);
    if (!call) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(call);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
