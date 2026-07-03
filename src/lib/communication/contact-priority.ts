import type { EmergencyContactTarget } from "./types";

/** Lower priority number = contacted first. Favorites break ties. */
export function sortContactsForEscalation(
  contacts: EmergencyContactTarget[]
): EmergencyContactTarget[] {
  return [...contacts].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.name.localeCompare(b.name);
  });
}

export function filterContactsForMode(
  contacts: EmergencyContactTarget[],
  mode: "sos" | "checkin"
): EmergencyContactTarget[] {
  if (mode === "checkin") {
    return contacts;
  }
  return contacts.filter((c) => c.notifyOnSos);
}
