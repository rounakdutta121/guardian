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

  const header =
    context.reason === "checkin_missed"
      ? "🚨 CHECK-IN MISSED — POSSIBLE EMERGENCY"
      : context.reason === "checkin_need_help"
        ? "🚨 CHECK-IN — I NEED HELP"
        : "🚨 EMERGENCY ALERT";

  const intro =
    context.reason === "checkin_missed"
      ? "I did not confirm my safe check-in in time."
      : context.reason === "checkin_need_help"
        ? "I pressed Need Help during my safe check-in."
        : "I may be in danger.";

  return [
    header,
    "",
    intro,
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
