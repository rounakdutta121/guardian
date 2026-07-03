"use client";

import { useOfflineStore } from "@/stores";
import { getActiveUserId, getStoredUserId } from "@/lib/client/user-session";

interface LocalQueueItem {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

function getQueueKey() {
  const userId = getActiveUserId() ?? getStoredUserId();
  if (!userId) return null;
  return `guardian-offline-queue-${userId}`;
}

function readLocalQueue(): LocalQueueItem[] {
  if (typeof window === "undefined") return [];
  const key = getQueueKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LocalQueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocalQueue(items: LocalQueueItem[]) {
  const key = getQueueKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(items));
  useOfflineStore.getState().setQueueCount(items.length);
}

export function enqueueOfflineAction(
  action: string,
  payload: Record<string, unknown>
) {
  const key = getQueueKey();
  if (!key) return;
  const items = readLocalQueue();
  items.push({
    id: crypto.randomUUID(),
    action,
    payload,
    createdAt: new Date().toISOString(),
  });
  writeLocalQueue(items);
}

export async function syncOfflineQueue(): Promise<number> {
  if (!navigator.onLine) return 0;
  const key = getQueueKey();
  if (!key) return 0;

  const local = readLocalQueue();
  let synced = 0;

  for (const item of local) {
    try {
      const res = await fetch("/api/offline-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: item.action, payload: item.payload }),
      });
      if (!res.ok) throw new Error("Sync failed");
      synced++;
    } catch {
      break;
    }
  }

  if (synced > 0) {
    writeLocalQueue(local.slice(synced));
    await fetch("/api/offline-sync", { method: "GET" });
  }

  return synced;
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    return res;
  } catch {
    if (options.method === "POST" || options.method === "PATCH") {
      const body = options.body ? JSON.parse(options.body as string) : {};
      const action = url.includes("/emergency")
        ? "emergency_start"
        : url.includes("/emergency-contacts")
          ? "contact_create"
          : url.includes("/checkin")
            ? "checkin_create"
            : url.includes("/journey")
              ? "journey_location"
              : "generic";
      enqueueOfflineAction(action, { url, body, method: options.method });
    }
    throw new Error("OFFLINE");
  }
}
