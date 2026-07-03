import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth/server";
import { auth } from "@/lib/auth";
import { activityLogRepo } from "@/lib/repositories";

export async function DELETE() {
  try {
    const session = await requireAuth();

    await activityLogRepo.create(session.user.id, {
      type: "settings_change",
      title: "Account Deleted",
      description: "User requested account deletion",
    });

    await auth.api.deleteUser({
      headers: await headers(),
      body: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
