import { db } from "@/lib/db";
import {
  profiles,
  emergencyContacts,
  emergencySessions,
  journeySessions,
  journeyLocations,
  safeCheckins,
  fakeCalls,
  notifications,
  userSettings,
  permissions,
  activityLogs,
  deviceTokens,
  evidenceFiles,
  offlineQueue,
} from "@/lib/db/schema";
import { eq, and, desc, isNull, sql, count } from "drizzle-orm";
import type { EmergencyContactInput, ProfileInput } from "@/lib/validations";
import { normalizePhone } from "@/lib/validations";

export class ProfileRepository {
  async findByUserId(userId: string) {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), isNull(profiles.deletedAt)))
      .limit(1);
    return profile ?? null;
  }

  async upsert(userId: string, data: ProfileInput) {
    const existing = await this.findByUserId(userId);
    if (existing) {
      const [updated] = await db
        .update(profiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(profiles.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(profiles)
      .values({ ...data, userId })
      .returning();
    return created;
  }
}

export class EmergencyContactRepository {
  async findByUserId(userId: string) {
    return db
      .select()
      .from(emergencyContacts)
      .where(
        and(eq(emergencyContacts.userId, userId), isNull(emergencyContacts.deletedAt))
      )
      .orderBy(emergencyContacts.priority, desc(emergencyContacts.isFavorite));
  }

  async findById(id: string, userId: string) {
    const [contact] = await db
      .select()
      .from(emergencyContacts)
      .where(
        and(
          eq(emergencyContacts.id, id),
          eq(emergencyContacts.userId, userId),
          isNull(emergencyContacts.deletedAt)
        )
      )
      .limit(1);
    return contact ?? null;
  }

  async create(userId: string, data: EmergencyContactInput) {
    const [contact] = await db
      .insert(emergencyContacts)
      .values({
        ...data,
        userId,
        email: data.email ? data.email : null,
        relationship: data.relationship ?? null,
        notes: data.notes ?? null,
      })
      .returning();
    return contact;
  }

  async update(id: string, userId: string, data: Partial<EmergencyContactInput>) {
    const [updated] = await db
      .update(emergencyContacts)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(emergencyContacts.id, id), eq(emergencyContacts.userId, userId))
      )
      .returning();
    return updated;
  }

  async softDelete(id: string, userId: string) {
    const [deleted] = await db
      .update(emergencyContacts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(emergencyContacts.id, id), eq(emergencyContacts.userId, userId))
      )
      .returning();
    return deleted;
  }

  async search(userId: string, query: string) {
    const pattern = `%${query}%`;
    return db
      .select()
      .from(emergencyContacts)
      .where(
        and(
          eq(emergencyContacts.userId, userId),
          isNull(emergencyContacts.deletedAt),
          sql`(${emergencyContacts.name} ILIKE ${pattern} OR ${emergencyContacts.phone} ILIKE ${pattern})`
        )
      )
      .orderBy(emergencyContacts.priority);
  }

  async findByPhone(userId: string, phone: string, excludeId?: string) {
    const normalized = normalizePhone(phone);
    const contacts = await this.findByUserId(userId);
    return contacts.find((c) => {
      if (excludeId && c.id === excludeId) return false;
      return normalizePhone(c.phone) === normalized;
    }) ?? null;
  }
}

export class EmergencySessionRepository {
  async create(
    userId: string,
    data: Omit<typeof emergencySessions.$inferInsert, "userId">
  ) {
    const [session] = await db
      .insert(emergencySessions)
      .values({ ...data, userId })
      .returning();
    return session;
  }

  async findById(id: string, userId: string) {
    const [session] = await db
      .select()
      .from(emergencySessions)
      .where(
        and(
          eq(emergencySessions.id, id),
          eq(emergencySessions.userId, userId),
          isNull(emergencySessions.deletedAt)
        )
      )
      .limit(1);
    return session ?? null;
  }

  async update(
    id: string,
    userId: string,
    data: Partial<typeof emergencySessions.$inferInsert>
  ) {
    const [updated] = await db
      .update(emergencySessions)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(emergencySessions.id, id),
          eq(emergencySessions.userId, userId)
        )
      )
      .returning();
    return updated;
  }

  async findByUserId(userId: string, limit = 20) {
    return db
      .select()
      .from(emergencySessions)
      .where(
        and(
          eq(emergencySessions.userId, userId),
          isNull(emergencySessions.deletedAt)
        )
      )
      .orderBy(desc(emergencySessions.createdAt))
      .limit(limit);
  }

  async findActive(userId: string) {
    const [session] = await db
      .select()
      .from(emergencySessions)
      .where(
        and(
          eq(emergencySessions.userId, userId),
          sql`${emergencySessions.status} IN ('countdown', 'active')`,
          isNull(emergencySessions.deletedAt)
        )
      )
      .limit(1);
    return session ?? null;
  }
}

export class JourneyRepository {
  async create(
    userId: string,
    data: Omit<typeof journeySessions.$inferInsert, "userId" | "shareToken">
  ) {
    const shareToken = crypto.randomUUID().slice(0, 8);
    const [journey] = await db
      .insert(journeySessions)
      .values({ ...data, userId, shareToken })
      .returning();
    return journey;
  }

  async findById(id: string, userId: string) {
    const [journey] = await db
      .select()
      .from(journeySessions)
      .where(
        and(
          eq(journeySessions.id, id),
          eq(journeySessions.userId, userId),
          isNull(journeySessions.deletedAt)
        )
      )
      .limit(1);
    return journey ?? null;
  }

  async update(
    id: string,
    userId: string,
    data: Partial<typeof journeySessions.$inferInsert>
  ) {
    const [updated] = await db
      .update(journeySessions)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(journeySessions.id, id), eq(journeySessions.userId, userId))
      )
      .returning();
    return updated;
  }

  async findByUserId(userId: string, limit = 20) {
    return db
      .select()
      .from(journeySessions)
      .where(
        and(
          eq(journeySessions.userId, userId),
          isNull(journeySessions.deletedAt)
        )
      )
      .orderBy(desc(journeySessions.createdAt))
      .limit(limit);
  }

  async findActive(userId: string, guardianMode?: boolean) {
    const conditions = [
      eq(journeySessions.userId, userId),
      sql`${journeySessions.status} IN ('active', 'paused')`,
      isNull(journeySessions.deletedAt),
    ];
    if (guardianMode !== undefined) {
      conditions.push(eq(journeySessions.isGuardianMode, guardianMode));
    }
    const [journey] = await db
      .select()
      .from(journeySessions)
      .where(and(...conditions))
      .limit(1);
    return journey ?? null;
  }

  async findByShareToken(shareToken: string) {
    const [journey] = await db
      .select()
      .from(journeySessions)
      .where(
        and(
          eq(journeySessions.shareToken, shareToken),
          isNull(journeySessions.deletedAt),
          sql`${journeySessions.status} IN ('active', 'paused')`
        )
      )
      .limit(1);
    return journey ?? null;
  }

  async getLocations(journeyId: string, userId: string, limit = 100) {
    const journey = await this.findById(journeyId, userId);
    if (!journey) return [];
    return this.getLocationsForJourney(journeyId, limit);
  }

  async getLocationsForJourney(journeyId: string, limit = 100) {
    return db
      .select()
      .from(journeyLocations)
      .where(eq(journeyLocations.journeyId, journeyId))
      .orderBy(desc(journeyLocations.recordedAt))
      .limit(limit);
  }

  async addLocation(
    journeyId: string,
    userId: string,
    data: Omit<typeof journeyLocations.$inferInsert, "journeyId">
  ) {
    const journey = await this.findById(journeyId, userId);
    if (!journey) throw new Error("Journey not found");
    const [location] = await db
      .insert(journeyLocations)
      .values({ ...data, journeyId })
      .returning();
    return location;
  }
}

export class SafeCheckinRepository {
  async create(userId: string, data: Omit<typeof safeCheckins.$inferInsert, "userId">) {
    const [checkin] = await db
      .insert(safeCheckins)
      .values({ ...data, userId })
      .returning();
    return checkin;
  }

  async findById(id: string, userId: string) {
    const [checkin] = await db
      .select()
      .from(safeCheckins)
      .where(
        and(
          eq(safeCheckins.id, id),
          eq(safeCheckins.userId, userId),
          isNull(safeCheckins.deletedAt)
        )
      )
      .limit(1);
    return checkin ?? null;
  }

  async update(
    id: string,
    userId: string,
    data: Partial<typeof safeCheckins.$inferInsert>
  ) {
    const [updated] = await db
      .update(safeCheckins)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(safeCheckins.id, id), eq(safeCheckins.userId, userId)))
      .returning();
    return updated;
  }

  async findByUserId(userId: string, limit = 20) {
    return db
      .select()
      .from(safeCheckins)
      .where(
        and(eq(safeCheckins.userId, userId), isNull(safeCheckins.deletedAt))
      )
      .orderBy(desc(safeCheckins.createdAt))
      .limit(limit);
  }

  async findActive(userId: string) {
    const [checkin] = await db
      .select()
      .from(safeCheckins)
      .where(
        and(
          eq(safeCheckins.userId, userId),
          eq(safeCheckins.status, "active"),
          isNull(safeCheckins.deletedAt)
        )
      )
      .limit(1);
    return checkin ?? null;
  }
}

export class FakeCallRepository {
  async create(userId: string, data: Omit<typeof fakeCalls.$inferInsert, "userId">) {
    const [call] = await db
      .insert(fakeCalls)
      .values({ ...data, userId })
      .returning();
    return call;
  }

  async findById(id: string, userId: string) {
    const [call] = await db
      .select()
      .from(fakeCalls)
      .where(
        and(
          eq(fakeCalls.id, id),
          eq(fakeCalls.userId, userId),
          isNull(fakeCalls.deletedAt)
        )
      )
      .limit(1);
    return call ?? null;
  }

  async update(
    id: string,
    userId: string,
    data: Partial<typeof fakeCalls.$inferInsert>
  ) {
    const [updated] = await db
      .update(fakeCalls)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(fakeCalls.id, id), eq(fakeCalls.userId, userId)))
      .returning();
    return updated;
  }

  async findByUserId(userId: string, limit = 20) {
    return db
      .select()
      .from(fakeCalls)
      .where(
        and(eq(fakeCalls.userId, userId), isNull(fakeCalls.deletedAt))
      )
      .orderBy(desc(fakeCalls.createdAt))
      .limit(limit);
  }

  async findScheduled(userId: string) {
    return db
      .select()
      .from(fakeCalls)
      .where(
        and(
          eq(fakeCalls.userId, userId),
          eq(fakeCalls.status, "scheduled"),
          isNull(fakeCalls.deletedAt)
        )
      )
      .orderBy(fakeCalls.scheduledAt);
  }
}

export class NotificationRepository {
  async create(userId: string, data: Omit<typeof notifications.$inferInsert, "userId">) {
    const [notification] = await db
      .insert(notifications)
      .values({ ...data, userId })
      .returning();
    return notification;
  }

  async findByUserId(userId: string, limit = 50) {
    return db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.deletedAt))
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markAsRead(id: string, userId: string) {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(eq(notifications.id, id), eq(notifications.userId, userId))
      )
      .returning();
    return updated;
  }

  async markAllAsRead(userId: string) {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      );
  }

  async getUnreadCount(userId: string) {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          isNull(notifications.deletedAt)
        )
      );
    return result?.count ?? 0;
  }

  async softDelete(id: string, userId: string) {
    const [deleted] = await db
      .update(notifications)
      .set({ deletedAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return deleted;
  }
}

export class SettingsRepository {
  async findByUserId(userId: string) {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    return settings ?? null;
  }

  async upsert(userId: string, data: Partial<typeof userSettings.$inferInsert>) {
    const existing = await this.findByUserId(userId);
    if (existing) {
      const [updated] = await db
        .update(userSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(userSettings)
      .values({ ...data, userId })
      .returning();
    return created;
  }
}

export class PermissionsRepository {
  async findByUserId(userId: string) {
    const [perms] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.userId, userId))
      .limit(1);
    return perms ?? null;
  }

  async upsert(userId: string, data: Partial<typeof permissions.$inferInsert>) {
    const existing = await this.findByUserId(userId);
    if (existing) {
      const [updated] = await db
        .update(permissions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(permissions.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(permissions)
      .values({ ...data, userId })
      .returning();
    return created;
  }
}

export class ActivityLogRepository {
  async create(userId: string, data: Omit<typeof activityLogs.$inferInsert, "userId">) {
    const [log] = await db
      .insert(activityLogs)
      .values({ ...data, userId })
      .returning();
    return log;
  }

  async findByUserId(
    userId: string,
    options: { limit?: number; offset?: number; type?: string; search?: string } = {}
  ) {
    const { limit = 50, offset = 0, type, search } = options;
    const conditions = [eq(activityLogs.userId, userId)];
    if (type) {
      conditions.push(eq(activityLogs.type, type as typeof activityLogs.type.enumValues[number]));
    }
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        sql`(${activityLogs.title} ILIKE ${pattern} OR ${activityLogs.description} ILIKE ${pattern})`
      );
    }
    return db
      .select()
      .from(activityLogs)
      .where(and(...conditions))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }
}

export class OfflineQueueRepository {
  async enqueue(userId: string, action: string, payload: Record<string, unknown>) {
    const [item] = await db
      .insert(offlineQueue)
      .values({ userId, action, payload })
      .returning();
    return item;
  }

  async getPending(userId: string) {
    return db
      .select()
      .from(offlineQueue)
      .where(
        and(eq(offlineQueue.userId, userId), eq(offlineQueue.status, "pending"))
      )
      .orderBy(offlineQueue.createdAt);
  }

  async markProcessed(id: string, userId: string) {
    await db
      .update(offlineQueue)
      .set({ status: "completed", processedAt: new Date() })
      .where(
        and(eq(offlineQueue.id, id), eq(offlineQueue.userId, userId))
      );
  }

  async markFailed(id: string, userId: string, error: string) {
    await db
      .update(offlineQueue)
      .set({
        status: "failed",
        lastError: error,
        retryCount: sql`${offlineQueue.retryCount} + 1`,
      })
      .where(
        and(eq(offlineQueue.id, id), eq(offlineQueue.userId, userId))
      );
  }
}

export const profileRepo = new ProfileRepository();
export const emergencyContactRepo = new EmergencyContactRepository();
export const emergencySessionRepo = new EmergencySessionRepository();
export const journeyRepo = new JourneyRepository();
export const safeCheckinRepo = new SafeCheckinRepository();
export const fakeCallRepo = new FakeCallRepository();
export const notificationRepo = new NotificationRepository();
export const settingsRepo = new SettingsRepository();
export const permissionsRepo = new PermissionsRepository();
export const activityLogRepo = new ActivityLogRepository();
export const offlineQueueRepo = new OfflineQueueRepository();
