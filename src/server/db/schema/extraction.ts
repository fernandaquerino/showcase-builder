import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

/**
 * Cache of product-extraction results. `urlHash` is the preferred product
 * identity; metadata also stores alternate lookup hashes so affiliate URLs
 * with different campaigns can share the same result.
 */
export const productExtractionCache = pgTable(
  "product_extraction_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    urlHash: text("url_hash").notNull().unique(),
    sourceUrl: text("source_url").notNull(),
    finalUrl: text("final_url"),
    name: text("name"),
    imageUrl: text("image_url"),
    price: numeric("price", { precision: 12, scale: 2 }),
    color: text("color"),
    metadata: jsonb("metadata"),
    extractionSource: text("extraction_source"),
    status: text("status").notNull(),
    errorCode: text("error_code"),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("extraction_cache_expires_at_idx").on(table.expiresAt)],
);

/**
 * Fixed-window rate limiting per authenticated user, persisted (serverless has
 * no shared process memory). One row per `(user_id, window_start)`; the counter
 * is incremented with an atomic upsert.
 */
export const extractionRateLimits = pgTable(
  "extraction_rate_limits",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    windowStart: timestamp("window_start", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.windowStart] }),
    index("extraction_rate_limits_window_idx").on(table.windowStart),
  ],
);
