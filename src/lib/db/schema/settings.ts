import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    sosCountdownSeconds: integer("sos_countdown_seconds").notNull().default(3),
    autoShareLocation: boolean("auto_share_location").notNull().default(true),
    enableVibration: boolean("enable_vibration").notNull().default(true),
    enableSound: boolean("enable_sound").notNull().default(true),
    fakeCallRingtone: text("fake_call_ringtone").default("default"),
    defaultCheckinMinutes: integer("default_checkin_minutes")
      .notNull()
      .default(30),
    journeyAutoShare: boolean("journey_auto_share").notNull().default(true),
    emergencyMessage: text("emergency_message"),
    privacyShareData: boolean("privacy_share_data").notNull().default(true),
    analyticsEnabled: boolean("analytics_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("user_settings_user_id_idx").on(table.userId)]
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    location: boolean("location").notNull().default(false),
    notifications: boolean("notifications").notNull().default(false),
    contacts: boolean("contacts").notNull().default(false),
    camera: boolean("camera").notNull().default(false),
    microphone: boolean("microphone").notNull().default(false),
    backgroundLocation: boolean("background_location").notNull().default(false),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("permissions_user_id_idx").on(table.userId)]
);

export const activityTypeEnum = pgEnum("activity_type", [
  "sos",
  "test_sos",
  "checkin",
  "journey_start",
  "journey_end",
  "guardian_mode",
  "fake_call",
  "contact_added",
  "profile_update",
  "login",
  "settings_change",
]);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_logs_user_id_idx").on(table.userId),
    index("activity_logs_type_idx").on(table.type),
    index("activity_logs_created_at_idx").on(table.createdAt),
  ]
);

export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: text("platform").notNull(),
    deviceName: text("device_name"),
    isActive: boolean("is_active").notNull().default(true),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("device_tokens_user_id_idx").on(table.userId),
    index("device_tokens_token_idx").on(table.token),
  ]
);

export const evidenceTypeEnum = pgEnum("evidence_type", [
  "photo",
  "video",
  "audio",
  "document",
]);

export const evidenceFiles = pgTable(
  "evidence_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    emergencySessionId: uuid("emergency_session_id"),
    type: evidenceTypeEnum("type").notNull(),
    fileName: text("file_name").notNull(),
    fileUrl: text("file_url").notNull(),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("evidence_files_user_id_idx").on(table.userId),
    index("evidence_files_emergency_session_id_idx").on(
      table.emergencySessionId
    ),
  ]
);

export const offlineQueue = pgTable(
  "offline_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(5),
    status: text("status").notNull().default("pending"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("offline_queue_user_id_idx").on(table.userId),
    index("offline_queue_status_idx").on(table.status),
  ]
);
