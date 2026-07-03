import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const emergencyStatusEnum = pgEnum("emergency_status", [
  "countdown",
  "active",
  "resolved",
  "cancelled",
  "failed",
]);

export const emergencyTriggerEnum = pgEnum("emergency_trigger", [
  "sos_button",
  "test_sos",
  "safe_checkin",
  "guardian_mode",
  "manual",
]);

export const emergencySessions = pgTable(
  "emergency_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: emergencyStatusEnum("status").notNull().default("countdown"),
    trigger: emergencyTriggerEnum("trigger").notNull(),
    isTest: boolean("is_test").notNull().default(false),
    latitude: real("latitude"),
    longitude: real("longitude"),
    accuracy: real("accuracy"),
    address: text("address"),
    mapsUrl: text("maps_url"),
    batteryLevel: integer("battery_level"),
    smsPreview: jsonb("sms_preview").$type<string[]>(),
    callPreview: jsonb("call_preview").$type<string[]>(),
    timeline: jsonb("timeline").$type<
      Array<{ event: string; timestamp: string; data?: Record<string, unknown> }>
    >(),
    contactsNotified: jsonb("contacts_notified").$type<string[]>(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("emergency_sessions_user_id_idx").on(table.userId),
    index("emergency_sessions_status_idx").on(table.status),
    index("emergency_sessions_created_at_idx").on(table.createdAt),
  ]
);
