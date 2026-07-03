import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth/server";
import { auth } from "@/lib/auth";
import { profileRepo } from "@/lib/repositories";
import { profileSchema } from "@/lib/validations";
import { onboardingService } from "@/lib/services";

export async function GET() {
  try {
    const session = await requireAuth();
    const profile = await profileRepo.findByUserId(session.user.id);
    return NextResponse.json({
      user: session.user,
      profile,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = profileSchema.parse(body);
    const profile = await profileRepo.upsert(session.user.id, parsed);

    const isOnboarding = Boolean(parsed.displayName) && !session.user.profileCompleted;
    const isNameUpdate = Boolean(parsed.displayName);

    if (isOnboarding || isNameUpdate) {
      const displayName = parsed.displayName || session.user.name;
      await auth.api.updateUser({
        headers: await headers(),
        body: {
          ...(isOnboarding ? { profileCompleted: true } : {}),
          ...(isNameUpdate ? { name: displayName } : {}),
        },
      });

      if (isOnboarding) {
        await onboardingService.initializeUser(session.user.id, displayName);
      }
    }

    return NextResponse.json({
      profile,
      profileCompleted: isOnboarding ? true : session.user.profileCompleted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
