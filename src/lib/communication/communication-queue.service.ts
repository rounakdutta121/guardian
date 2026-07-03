import { getActiveUserId, getStoredUserId } from "@/lib/client/user-session";
import type { QueuedCommunicationItem } from "./types";

const MAX_ATTEMPTS = 5;

function getQueueKey(): string | null {
  const userId = getActiveUserId() ?? getStoredUserId();
  if (!userId) return null;
  return `guardian-comm-queue-${userId}`;
}

function readQueue(): QueuedCommunicationItem[] {
  if (typeof window === "undefined") return [];
  const key = getQueueKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as QueuedCommunicationItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedCommunicationItem[]) {
  const key = getQueueKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(items));
}

export class CommunicationQueueService {
  enqueue(
    item: Omit<QueuedCommunicationItem, "id" | "attempts" | "maxAttempts" | "createdAt">
  ): QueuedCommunicationItem {
    const queue = readQueue();
    const entry: QueuedCommunicationItem = {
      ...item,
      id: crypto.randomUUID(),
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      createdAt: new Date().toISOString(),
    };
    queue.push(entry);
    writeQueue(queue);
    return entry;
  }

  getPending(): QueuedCommunicationItem[] {
    return readQueue().filter((item) => item.attempts < item.maxAttempts);
  }

  markAttempted(id: string, error?: string) {
    const queue = readQueue();
    const index = queue.findIndex((item) => item.id === id);
    if (index === -1) return;
    queue[index] = {
      ...queue[index],
      attempts: queue[index].attempts + 1,
      lastError: error,
    };
    writeQueue(queue);
  }

  remove(id: string) {
    writeQueue(readQueue().filter((item) => item.id !== id));
  }

  count(): number {
    return this.getPending().length;
  }
}

export const communicationQueue = new CommunicationQueueService();
