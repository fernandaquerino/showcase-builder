import {
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

export const liveStatus = pgEnum("live_status", ["draft", "published"]);

export const lives = pgTable(
  "lives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    store: text("store").notNull(),
    liveDate: date("live_date", { mode: "string" }).notNull(),
    liveTime: text("live_time"),
    platform: text("platform"),
    coverImageUrl: text("cover_image_url"),
    instagramUrl: text("instagram_url"),
    slug: text("slug").notNull(),
    status: liveStatus("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (live) => [
    uniqueIndex("lives_user_id_slug_unique").on(live.userId, live.slug),
    index("lives_user_id_idx").on(live.userId),
    index("lives_user_id_status_idx").on(live.userId, live.status),
  ],
);
