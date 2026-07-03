import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { safeCheckinService } from "@/lib/services";
import { safeCheckinRepo } from "@/lib/repositories";
import { locationSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const checkin = await safeCheckinRepo.findById(id, session.user.id);
    if (!checkin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(checkin);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

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
      case "confirm":
        result = await safeCheckinService.confirmCheckin(id, session.user.id);
        break;
      case "need_help": {
        const location = body.latitude
          ? locationSchema.parse(body)
          : undefined;
        result = await safeCheckinService.needHelp(id, session.user.id, location);
        break;
      }
      case "expire":
        result = await safeCheckinService.expireCheckin(id, session.user.id);
        break;
      case "cancel":
        result = await safeCheckinRepo.update(id, session.user.id, {
          status: "cancelled",
        });
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
