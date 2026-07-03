import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { emergencyContactRepo, activityLogRepo } from "@/lib/repositories";
import {
  emergencyContactSchema,
  toEmergencyContactPayload,
  emergencyContactFormSchema,
} from "@/lib/validations";

export async function GET() {
  try {
    const session = await requireAuth();
    const contacts = await emergencyContactRepo.findByUserId(session.user.id);
    return NextResponse.json(contacts);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const formParsed = emergencyContactFormSchema.parse(body);
    const parsed = emergencyContactSchema.parse(
      toEmergencyContactPayload(formParsed)
    );

    const duplicate = await emergencyContactRepo.findByPhone(
      session.user.id,
      parsed.phone
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "A contact with this phone number already exists" },
        { status: 409 }
      );
    }

    const contact = await emergencyContactRepo.create(
      session.user.id,
      parsed
    );

    await activityLogRepo.create(session.user.id, {
      type: "contact_added",
      title: "Emergency Contact Added",
      description: `${contact.name} (${contact.phone})`,
      metadata: { contactId: contact.id },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
