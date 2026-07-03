import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { activityLogRepo, notificationRepo } from "@/lib/repositories";
import { z } from "zod";

const feedbackSchema = z.object({
  message: z.string().min(10).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = feedbackSchema.parse(body);

    await activityLogRepo.create(session.user.id, {
      type: "settings_change",
      title: "Feedback Submitted",
      description: parsed.message.slice(0, 200),
      metadata: { rating: parsed.rating, message: parsed.message },
    });

    await notificationRepo.create(session.user.id, {
      type: "system",
      title: "Thank you for your feedback",
      body: "We've received your message and will review it soon.",
      data: { rating: parsed.rating, route: "/settings/support" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid feedback";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
