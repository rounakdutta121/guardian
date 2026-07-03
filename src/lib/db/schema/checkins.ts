import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const checkinStatusEnum = pgEnum("checkin_status", [
  "active",
  "confirmed",
  "missed",
  "need_help",
  "cancelled",
]);

export const safeCheckins = pgTable(
  "safe_checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: checkinStatusEnum("status").notNull().default("active"),
    durationMinutes: integer("duration_minutes").notNull(),
    message: text("message"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    emergencySessionId: uuid("emergency_session_id"),
    notifyContacts: boolean("notify_contacts").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("safe_checkins_user_id_idx").on(table.userId),
    index("safe_checkins_status_idx").on(table.status),
    index("safe_checkins_expires_at_idx").on(table.expiresAt),
  ]
);

export const fakeCallStatusEnum = pgEnum("fake_call_status", [
  "scheduled",
  "ringing",
  "answered",
  "missed",
  "cancelled",
]);

export const fakeCalls = pgTable(
  "fake_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: fakeCallStatusEnum("status").notNull().default("scheduled"),
    callerName: text("caller_name").notNull(),
    callerNumber: text("caller_number"),
    callerPhotoUrl: text("caller_photo_url"),
    delaySeconds: integer("delay_seconds").notNull().default(0),
    ringtone: text("ringtone").default("default"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("fake_calls_user_id_idx").on(table.userId),
    index("fake_calls_status_idx").on(table.status),
    index("fake_calls_scheduled_at_idx").on(table.scheduledAt),
  ]
);
