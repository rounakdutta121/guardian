import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import {
  settingsRepo,
  permissionsRepo,
  activityLogRepo,
} from "@/lib/repositories";
import { settingsSchema, permissionsSchema } from "@/lib/validations";

async function ensureUserSettings(userId: string) {
  let settings = await settingsRepo.findByUserId(userId);
  if (!settings) {
    settings = await settingsRepo.upsert(userId, {});
  }
  return settings;
}

async function ensureUserPermissions(userId: string) {
  let permissions = await permissionsRepo.findByUserId(userId);
  if (!permissions) {
    permissions = await permissionsRepo.upsert(userId, {});
  }
  return permissions;
}

export async function GET() {
  try {
    const session = await requireAuth();
    const [settings, permissions] = await Promise.all([
      ensureUserSettings(session.user.id),
      ensureUserPermissions(session.user.id),
    ]);
    return NextResponse.json({ settings, permissions });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { settings: settingsData, permissions: permissionsData } = body;

    const results: Record<string, unknown> = {};

    if (settingsData) {
      const parsed = settingsSchema.parse(settingsData);
      results.settings = await settingsRepo.upsert(session.user.id, parsed);

      await activityLogRepo.create(session.user.id, {
        type: "settings_change",
        title: "Settings Updated",
        description: `Updated: ${Object.keys(parsed).join(", ")}`,
        metadata: parsed,
      });
    }

    if (permissionsData) {
      const parsed = permissionsSchema.parse(permissionsData);
      const { grantedAt, ...permFields } = parsed;

      const permissionUpdate: Record<string, unknown> = { ...permFields };

      const anyGranted = Object.values(permFields).some((v) => v === true);
      if (anyGranted) {
        permissionUpdate.grantedAt = grantedAt
          ? new Date(grantedAt)
          : new Date();
      }

      results.permissions = await permissionsRepo.upsert(
        session.user.id,
        permissionUpdate
      );
    }

    if (!settingsData && !permissionsData) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
