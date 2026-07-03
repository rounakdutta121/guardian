import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { emergencyContactRepo } from "@/lib/repositories";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    if (!q) {
      const contacts = await emergencyContactRepo.findByUserId(session.user.id);
      return NextResponse.json(contacts);
    }
    const contacts = await emergencyContactRepo.search(session.user.id, q);
    return NextResponse.json(contacts);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
