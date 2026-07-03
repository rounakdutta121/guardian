import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { journeyService } from "@/lib/services";
import { journeyRepo } from "@/lib/repositories";
import { locationSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const journey = await journeyRepo.findById(id, session.user.id);
    if (!journey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const locations = await journeyRepo.getLocations(id, session.user.id);
    return NextResponse.json({ journey, locations });
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
      case "pause":
        result = await journeyService.pauseJourney(id, session.user.id);
        break;
      case "resume":
        result = await journeyService.resumeJourney(id, session.user.id);
        break;
      case "stop":
        result = await journeyService.stopJourney(id, session.user.id);
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const location = locationSchema.parse(body);
    const result = await journeyService.recordLocation(
      id,
      session.user.id,
      location
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
