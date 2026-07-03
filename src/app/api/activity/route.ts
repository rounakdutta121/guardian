import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { activityLogRepo } from "@/lib/repositories";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? undefined;
    const search = searchParams.get("q") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? 50);
    const offset = Number(searchParams.get("offset") ?? 0);

    const activities = await activityLogRepo.findByUserId(session.user.id, {
      type,
      search,
      limit,
      offset,
    });

    return NextResponse.json(activities);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
