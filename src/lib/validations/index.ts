import { z } from "zod";

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length >= 10 && digits.length <= 15) {
    return digits.startsWith("+") ? digits : `+${digits}`;
  }
  return digits;
}

export const emergencyContactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => {
      const digits = val.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }, "Enter a valid phone number (at least 10 digits)"),
  email: z.string().email().optional().or(z.literal("")),
  relationship: z.string().max(50).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  isFavorite: z.boolean().optional(),
  notifyOnSos: z.boolean().optional(),
  notifyOnCheckin: z.boolean().optional(),
  notifyOnJourney: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const emergencyContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z
    .string()
    .min(1)
    .transform(normalizePhone)
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      },
      { message: "Valid phone number required (10-15 digits)" }
    ),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  relationship: z.string().max(50).optional().nullable(),
  priority: z.number().int().min(1).max(10),
  isFavorite: z.boolean(),
  notifyOnSos: z.boolean(),
  notifyOnCheckin: z.boolean(),
  notifyOnJourney: z.boolean(),
  notes: z.string().max(500).optional().nullable(),
});

export function toEmergencyContactPayload(
  data: z.infer<typeof emergencyContactFormSchema>
): z.infer<typeof emergencyContactSchema> {
  return {
    name: data.name.trim(),
    phone: normalizePhone(data.phone),
    email: data.email || "",
    relationship: data.relationship?.trim() || undefined,
    priority: data.priority ?? 1,
    isFavorite: data.isFavorite ?? false,
    notifyOnSos: data.notifyOnSos ?? true,
    notifyOnCheckin: data.notifyOnCheckin ?? false,
    notifyOnJourney: data.notifyOnJourney ?? false,
    notes: data.notes?.trim() || undefined,
  };
}

export const profileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().optional(),
  bloodType: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"])
    .optional(),
  allergies: z.string().max(500).optional(),
  medicalConditions: z.string().max(500).optional(),
  medications: z.string().max(500).optional(),
  emergencyNotes: z.string().max(1000).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.enum(["en", "hi", "es", "fr"]).optional(),
});

export const safeCheckinSchema = z.object({
  durationMinutes: z.number().int().min(5).max(480),
  message: z.string().max(200).optional(),
  notifyContacts: z.boolean(),
});

export const fakeCallSchema = z.object({
  callerName: z.string().min(1).max(50),
  callerNumber: z.string().max(20).optional(),
  callerPhotoUrl: z.string().max(500000).optional(),
  delaySeconds: z.number().int().min(0).max(3600),
  ringtone: z.string(),
  scheduledAt: z.string().datetime().optional(),
});

export const journeySchema = z.object({
  destinationName: z.string().min(1).max(200),
  destinationLat: z.number().optional(),
  destinationLng: z.number().optional(),
  originName: z.string().max(200).optional(),
  originLat: z.number().optional(),
  originLng: z.number().optional(),
  travelType: z.enum(["walking", "cycling", "driving", "transit", "other"]),
  etaMinutes: z.number().int().min(1).optional(),
  isGuardianMode: z.boolean(),
});

export const emergencyTriggerSchema = z.object({
  trigger: z.enum([
    "sos_button",
    "test_sos",
    "safe_checkin",
    "guardian_mode",
    "manual",
  ]),
  isTest: z.boolean(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().optional(),
  address: z.string().optional(),
  batteryLevel: z.number().int().min(0).max(100).optional(),
});

export const settingsSchema = z.object({
  sosCountdownSeconds: z.coerce.number().int().min(1).max(10).optional(),
  autoShareLocation: z.boolean().optional(),
  enableVibration: z.boolean().optional(),
  enableSound: z.boolean().optional(),
  fakeCallRingtone: z.string().optional(),
  defaultCheckinMinutes: z.coerce.number().int().min(5).max(480).optional(),
  journeyAutoShare: z.boolean().optional(),
  emergencyMessage: z.string().max(500).optional().nullable(),
  privacyShareData: z.boolean().optional(),
  analyticsEnabled: z.boolean().optional(),
});

export const permissionsSchema = z.object({
  location: z.boolean().optional(),
  notifications: z.boolean().optional(),
  contacts: z.boolean().optional(),
  camera: z.boolean().optional(),
  microphone: z.boolean().optional(),
  backgroundLocation: z.boolean().optional(),
  grantedAt: z.union([z.string().datetime(), z.string()]).optional().nullable(),
});

export const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  batteryLevel: z.number().int().min(0).max(100).optional(),
});

export type EmergencyContactFormInput = z.infer<typeof emergencyContactFormSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type SafeCheckinInput = z.infer<typeof safeCheckinSchema>;
export type FakeCallInput = z.infer<typeof fakeCallSchema>;
export type JourneyInput = z.infer<typeof journeySchema>;
export type EmergencyTriggerInput = z.infer<typeof emergencyTriggerSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type PermissionsInput = z.infer<typeof permissionsSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
