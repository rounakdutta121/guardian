import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const journeyStatusEnum = pgEnum("journey_status", [
  "planned",
  "active",
  "paused",
  "completed",
  "cancelled",
]);

export const travelTypeEnum = pgEnum("travel_type", [
  "walking",
  "cycling",
  "driving",
  "transit",
  "other",
]);

export const journeySessions = pgTable(
  "journey_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: journeyStatusEnum("status").notNull().default("planned"),
    travelType: travelTypeEnum("travel_type").notNull().default("walking"),
    originName: text("origin_name"),
    originLat: real("origin_lat"),
    originLng: real("origin_lng"),
    destinationName: text("destination_name").notNull(),
    destinationLat: real("destination_lat"),
    destinationLng: real("destination_lng"),
    etaMinutes: integer("eta_minutes"),
    totalDistanceMeters: real("total_distance_meters"),
    currentDistanceMeters: real("current_distance_meters"),
    currentSpeedKmh: real("current_speed_kmh"),
    batteryLevel: integer("battery_level"),
    shareToken: text("share_token"),
    isGuardianMode: boolean("is_guardian_mode").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("journey_sessions_user_id_idx").on(table.userId),
    index("journey_sessions_status_idx").on(table.status),
    index("journey_sessions_share_token_idx").on(table.shareToken),
  ]
);

export const journeyLocations = pgTable(
  "journey_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    journeyId: uuid("journey_id")
      .notNull()
      .references(() => journeySessions.id, { onDelete: "cascade" }),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    accuracy: real("accuracy"),
    altitude: real("altitude"),
    speed: real("speed"),
    heading: real("heading"),
    batteryLevel: integer("battery_level"),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("journey_locations_journey_id_idx").on(table.journeyId),
    index("journey_locations_recorded_at_idx").on(table.recordedAt),
  ]
);
