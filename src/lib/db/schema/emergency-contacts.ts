import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const emergencyContacts = pgTable(
  "emergency_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    relationship: text("relationship"),
    priority: integer("priority").notNull().default(1),
    isFavorite: boolean("is_favorite").notNull().default(false),
    notifyOnSos: boolean("notify_on_sos").notNull().default(true),
    notifyOnCheckin: boolean("notify_on_checkin").notNull().default(false),
    notifyOnJourney: boolean("notify_on_journey").notNull().default(false),
    avatarUrl: text("avatar_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("emergency_contacts_user_id_idx").on(table.userId),
    index("emergency_contacts_priority_idx").on(table.userId, table.priority),
    index("emergency_contacts_favorite_idx").on(table.userId, table.isFavorite),
  ]
);
