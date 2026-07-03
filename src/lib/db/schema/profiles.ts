import {
  boolean,
  date,
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

export const bloodTypeEnum = pgEnum("blood_type", [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
]);

export const themeEnum = pgEnum("theme", ["light", "dark", "system"]);
export const languageEnum = pgEnum("language", ["en", "hi", "es", "fr"]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    dateOfBirth: date("date_of_birth"),
    bloodType: bloodTypeEnum("blood_type").default("unknown"),
    allergies: text("allergies"),
    medicalConditions: text("medical_conditions"),
    medications: text("medications"),
    emergencyNotes: text("emergency_notes"),
    address: text("address"),
    city: text("city"),
    country: text("country"),
    theme: themeEnum("theme").notNull().default("system"),
    language: languageEnum("language").notNull().default("en"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("profiles_user_id_idx").on(table.userId)]
);
