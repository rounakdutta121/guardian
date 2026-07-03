import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { emergencyContactRepo } from "@/lib/repositories";
import {
  emergencyContactSchema,
  emergencyContactFormSchema,
  toEmergencyContactPayload,
} from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const contact = await emergencyContactRepo.findById(id, session.user.id);
    if (!contact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(contact);
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
    const formParsed = emergencyContactFormSchema.partial().parse(body);
    const existing = await emergencyContactRepo.findById(id, session.user.id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const merged = toEmergencyContactPayload({
      name: formParsed.name ?? existing.name,
      phone: formParsed.phone ?? existing.phone,
      email: formParsed.email ?? existing.email ?? "",
      relationship: formParsed.relationship ?? existing.relationship ?? undefined,
      priority: formParsed.priority ?? existing.priority,
      isFavorite: formParsed.isFavorite ?? existing.isFavorite,
      notifyOnSos: formParsed.notifyOnSos ?? existing.notifyOnSos,
      notifyOnCheckin: formParsed.notifyOnCheckin ?? existing.notifyOnCheckin,
      notifyOnJourney: formParsed.notifyOnJourney ?? existing.notifyOnJourney,
      notes: formParsed.notes ?? existing.notes ?? undefined,
    });

    const parsed = emergencyContactSchema.parse(merged);

    if (formParsed.phone) {
      const duplicate = await emergencyContactRepo.findByPhone(
        session.user.id,
        parsed.phone,
        id
      );
      if (duplicate) {
        return NextResponse.json(
          { error: "A contact with this phone number already exists" },
          { status: 409 }
        );
      }
    }

    const contact = await emergencyContactRepo.update(
      id,
      session.user.id,
      parsed
    );
    return NextResponse.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    await emergencyContactRepo.softDelete(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
