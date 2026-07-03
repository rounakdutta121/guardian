import { generateMapsUrl } from "@/lib/utils";
import type { EmergencyMessageContext } from "./types";

export function buildEmergencySmsMessage(context: EmergencyMessageContext): string {
  const time = (context.timestamp ?? new Date()).toLocaleString();
  const locationUrl =
    context.mapsUrl ??
    (context.latitude != null && context.longitude != null
      ? generateMapsUrl(context.latitude, context.longitude)
      : "Location unavailable");

  const battery =
    context.batteryLevel != null
      ? `${context.batteryLevel}%`
      : "Unknown";

  return [
    "🚨 EMERGENCY ALERT",
    "",
    "I may be in danger.",
    "",
    "Current Location:",
    locationUrl,
    "",
    "Time:",
    time,
    "",
    "Battery:",
    battery,
    "",
    "Please contact me immediately.",
  ].join("\n");
}

export function buildSmsPreviewLine(
  phone: string,
  context: EmergencyMessageContext
): string {
  const message = buildEmergencySmsMessage(context);
  return `To: ${phone}\n${message}`;
}
