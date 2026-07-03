import { NextResponse } from "next/server";
import { journeyRepo } from "@/lib/repositories";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const journey = await journeyRepo.findByShareToken(token);
    if (!journey) {
      return NextResponse.json({ error: "Journey not found or ended" }, { status: 404 });
    }

    const locations = await journeyRepo.getLocationsForJourney(journey.id, 50);

    return NextResponse.json({
      destinationName: journey.destinationName,
      destinationLat: journey.destinationLat,
      destinationLng: journey.destinationLng,
      status: journey.status,
      startedAt: journey.startedAt,
      totalDistanceMeters: journey.totalDistanceMeters,
      currentSpeedKmh: journey.currentSpeedKmh,
      batteryLevel: journey.batteryLevel,
      etaMinutes: journey.etaMinutes,
      isGuardianMode: journey.isGuardianMode,
      locations: locations.reverse(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load journey" }, { status: 500 });
  }
}
