import { enqueueOfflineAction } from "@/lib/offline/client";
import { generateMapsUrl } from "@/lib/utils";
import type { StoredLocationPoint } from "./types";

function storageKey(sessionId: string) {
  return `guardian-emergency-locations-${sessionId}`;
}

export class EmergencyLocationTracker {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private watchId: number | null = null;
  private sessionId: string | null = null;

  storeLocally(sessionId: string, point: StoredLocationPoint) {
    if (typeof window === "undefined") return;
    const key = storageKey(sessionId);
    const existing = this.getLocalHistory(sessionId);
    existing.push(point);
    localStorage.setItem(key, JSON.stringify(existing));
  }

  getLocalHistory(sessionId: string): StoredLocationPoint[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(storageKey(sessionId));
      return raw ? (JSON.parse(raw) as StoredLocationPoint[]) : [];
    } catch {
      return [];
    }
  }

  clearLocalHistory(sessionId: string) {
    if (typeof window === "undefined") return;
    localStorage.removeItem(storageKey(sessionId));
  }

  private async syncPoint(
    sessionId: string,
    point: StoredLocationPoint
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/emergency/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy,
          batteryLevel: point.batteryLevel,
        }),
      });
      return res.ok;
    } catch {
      enqueueOfflineAction("emergency_location", {
        sessionId,
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy,
        batteryLevel: point.batteryLevel,
      });
      return false;
    }
  }

  async syncLocalHistory(sessionId: string): Promise<number> {
    const history = this.getLocalHistory(sessionId);
    let synced = 0;
    for (const point of history) {
      const ok = await this.syncPoint(sessionId, point);
      if (ok) synced++;
    }
    return synced;
  }

  start(
    sessionId: string,
    getPosition: () => {
      latitude: number | null;
      longitude: number | null;
      accuracy: number | null;
    },
    getBattery: () => Promise<number | null>,
    intervalMs = 10000
  ) {
    this.stop();
    this.sessionId = sessionId;

    const tick = async () => {
      const { latitude, longitude, accuracy } = getPosition();
      if (!latitude || !longitude) return;

      const batteryLevel = await getBattery();
      const point: StoredLocationPoint = {
        latitude,
        longitude,
        accuracy: accuracy ?? undefined,
        batteryLevel: batteryLevel ?? undefined,
        recordedAt: new Date().toISOString(),
      };

      this.storeLocally(sessionId, point);
      await this.syncPoint(sessionId, point);
    };

    tick();
    this.intervalId = setInterval(tick, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.watchId != null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.sessionId = null;
  }

  getMapsUrl(lat: number, lng: number) {
    return generateMapsUrl(lat, lng);
  }
}

export const emergencyLocationTracker = new EmergencyLocationTracker();
