export async function getBatteryLevel(): Promise<number | null> {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & {
    getBattery?: () => Promise<{ level: number }>;
  };
  if (!nav.getBattery) return null;
  try {
    const battery = await nav.getBattery();
    return Math.round(battery.level * 100);
  } catch {
    return null;
  }
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function speedKmhFromMps(mps: number): number {
  return mps * 3.6;
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

export function getNetworkStatus(): "online" | "offline" | "slow" {
  if (typeof navigator === "undefined") return "online";
  if (!navigator.onLine) return "offline";
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } })
    .connection;
  if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") {
    return "slow";
  }
  return "online";
}
