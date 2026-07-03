import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { emergencyEngine } from "@/lib/services";
import { emergencySessionRepo } from "@/lib/repositories";
import { locationSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const emergencySession = await emergencySessionRepo.findById(
      id,
      session.user.id
    );
    if (!emergencySession) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(emergencySession);
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
      case "activate":
        result = await emergencyEngine.activateEmergency(id, session.user.id);
        break;
      case "resolve":
        result = await emergencyEngine.resolveEmergency(id, session.user.id);
        break;
      case "cancel":
        result = await emergencyEngine.cancelEmergency(id, session.user.id);
        break;
      case "update_location": {
        const location = locationSchema.parse(body);
        result = await emergencyEngine.updateLocation(id, session.user.id, location);
        break;
      }
      case "log_event": {
        const { event, data } = body as {
          event: string;
          data?: Record<string, unknown>;
        };
        if (!event) {
          return NextResponse.json({ error: "Event required" }, { status: 400 });
        }
        result = await emergencyEngine.appendTimelineEvent(
          id,
          session.user.id,
          event,
          data
        );
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const location = locationSchema.parse(body);
    const result = await emergencyEngine.updateLocation(
      id,
      session.user.id,
      location
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
