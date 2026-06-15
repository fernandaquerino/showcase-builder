import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { lives } from "./lives";

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    liveId: uuid("live_id")
      .notNull()
      .references(() => lives.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    size: text("size"),
    color: text("color"),
    imageUrl: text("image_url").notNull(),
    productUrl: text("product_url").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }),
    position: integer("position").notNull(),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (product) => [
    index("products_live_id_idx").on(product.liveId),
    index("products_live_id_position_idx").on(product.liveId, product.position),
  ],
);
