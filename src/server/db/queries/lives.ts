import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import type { LiveThemeConfig } from "@/lib/live-theme";
import type { LiveFormData } from "@/lib/validations/live";
import { db } from "@/server/db";
import { lives } from "@/server/db/schema";

export type Live = typeof lives.$inferSelect;

/** Lists the lives owned by a user, most recently updated first. */
export async function getLivesByUserId(userId: string): Promise<Live[]> {
  return db
    .select()
    .from(lives)
    .where(eq(lives.userId, userId))
    .orderBy(desc(lives.updatedAt));
}

/** Fetches a single live, scoped to its owner. */
export async function getLiveByIdForUser(
  liveId: string,
  userId: string,
): Promise<Live | undefined> {
  return db.query.lives.findFirst({
    where: and(eq(lives.id, liveId), eq(lives.userId, userId)),
  });
}

/**
 * Checks whether a slug is free for a user, optionally ignoring a live being
 * edited (so keeping its own slug is allowed).
 */
export async function isLiveSlugAvailable(
  userId: string,
  slug: string,
  ignoredLiveId?: string,
): Promise<boolean> {
  const existing = await db.query.lives.findFirst({
    columns: { id: true },
    where: and(
      eq(lives.userId, userId),
      eq(lives.slug, slug),
      ignoredLiveId ? ne(lives.id, ignoredLiveId) : undefined,
    ),
  });

  return !existing;
}

export async function createLive(
  userId: string,
  input: LiveFormData & { slug: string },
): Promise<Live> {
  const [live] = await db
    .insert(lives)
    .values({ ...input, userId })
    .returning();

  if (!live) {
    throw new Error("Unable to create live.");
  }

  return live;
}

/** Updates a live scoped to its owner. Returns `null` when nothing matched. */
export async function updateLive(
  liveId: string,
  userId: string,
  input: LiveFormData,
): Promise<Live | null> {
  const [live] = await db
    .update(lives)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(lives.id, liveId), eq(lives.userId, userId)))
    .returning();

  return live ?? null;
}

/** Updates only the visual theme for a live scoped to its owner. */
export async function updateLiveTheme(
  liveId: string,
  userId: string,
  themeConfig: LiveThemeConfig | null,
): Promise<Live | null> {
  const [live] = await db
    .update(lives)
    .set({ themeConfig, updatedAt: new Date() })
    .where(and(eq(lives.id, liveId), eq(lives.userId, userId)))
    .returning();

  return live ?? null;
}

/**
 * Publishes a live and unpublishes any other published live of the same user in
 * a single atomic batch (neon-http has no interactive transactions, but
 * `db.batch` runs the statements in one Neon transaction). Both updates are
 * filtered by `user_id`, so concurrent publishes stay scoped to the owner.
 * Returns `null` when the target live does not belong to the user.
 */
export async function publishLive(
  liveId: string,
  userId: string,
): Promise<{ id: string } | null> {
  const now = new Date();

  const [, published] = await db.batch([
    db
      .update(lives)
      .set({ status: "draft", publishedAt: null, updatedAt: now })
      .where(
        and(
          eq(lives.userId, userId),
          eq(lives.status, "published"),
          eq(lives.id, liveId),
        ),
      ),
    db
      .update(lives)
      .set({ status: "published", publishedAt: now, updatedAt: now })
      .where(and(eq(lives.id, liveId), eq(lives.userId, userId)))
      .returning({ id: lives.id }),
  ]);

  return published[0] ?? null;
}

/** Unpublishes a live scoped to its owner. Returns `null` when nothing matched. */
export async function unpublishLive(
  liveId: string,
  userId: string,
): Promise<{ id: string } | null> {
  const [live] = await db
    .update(lives)
    .set({ status: "draft", publishedAt: null, updatedAt: new Date() })
    .where(and(eq(lives.id, liveId), eq(lives.userId, userId)))
    .returning({ id: lives.id });

  return live ?? null;
}

/** Deletes a live scoped to its owner. Returns `null` when nothing matched. */
export async function deleteLive(
  liveId: string,
  userId: string,
): Promise<{ id: string } | null> {
  const [live] = await db
    .delete(lives)
    .where(and(eq(lives.id, liveId), eq(lives.userId, userId)))
    .returning({ id: lives.id });

  return live ?? null;
}
