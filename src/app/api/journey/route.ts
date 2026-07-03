import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { journeyService } from "@/lib/services";
import { journeyRepo } from "@/lib/repositories";
import { journeySchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await requireAuth();
    const journeys = await journeyRepo.findByUserId(session.user.id);
    return NextResponse.json(journeys);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = journeySchema.parse(body);
    const journey = await journeyService.startJourney(session.user.id, parsed);
    return NextResponse.json(journey, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
