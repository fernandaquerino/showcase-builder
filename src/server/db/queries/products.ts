import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { isValidReorder } from "@/lib/reorder";
import type { ProductFormData } from "@/lib/validations/product";
import { db } from "@/server/db";
import { lives, products } from "@/server/db/schema";

export type Product = typeof products.$inferSelect;

/** Tuple type accepted by `db.batch`, used to keep variable-length batches typed. */
type BatchArg = Parameters<typeof db.batch>[0];

/**
 * Confirms a live belongs to the user. Every product mutation goes through this
 * so the ownership chain `product -> live -> user` is enforced on the server,
 * never trusting client-supplied ids.
 */
async function isLiveOwnedByUser(
  liveId: string,
  userId: string,
): Promise<boolean> {
  const live = await db.query.lives.findFirst({
    columns: { id: true },
    where: and(eq(lives.id, liveId), eq(lives.userId, userId)),
  });

  return Boolean(live);
}

/** Lists the products of a live (owner-scoped) ordered by `position` ascending. */
export async function getProductsByLiveIdForUser(
  liveId: string,
  userId: string,
): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .innerJoin(lives, eq(products.liveId, lives.id))
    .where(and(eq(products.liveId, liveId), eq(lives.userId, userId)))
    .orderBy(asc(products.position));

  return rows.map((row) => row.products);
}

/** Fetches a single product scoped to its live and owner. */
export async function getProductByIdForUser(
  productId: string,
  liveId: string,
  userId: string,
): Promise<Product | undefined> {
  const rows = await db
    .select()
    .from(products)
    .innerJoin(lives, eq(products.liveId, lives.id))
    .where(
      and(
        eq(products.id, productId),
        eq(products.liveId, liveId),
        eq(lives.userId, userId),
      ),
    )
    .limit(1);

  return rows[0]?.products;
}

/** Returns the distinct categories already used in a live, for form suggestions. */
export async function getCategoriesByLiveIdForUser(
  liveId: string,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .innerJoin(lives, eq(products.liveId, lives.id))
    .where(and(eq(products.liveId, liveId), eq(lives.userId, userId)))
    .orderBy(asc(products.category));

  return rows.map((row) => row.category);
}

/** Computes the next position for a new product (max + 1, or 0 when empty). */
export async function getNextProductPosition(
  liveId: string,
  userId: string,
): Promise<number> {
  const rows = await db
    .select({ max: sql<number | null>`max(${products.position})` })
    .from(products)
    .innerJoin(lives, eq(products.liveId, lives.id))
    .where(and(eq(products.liveId, liveId), eq(lives.userId, userId)));

  const max = rows[0]?.max;
  return max === null || max === undefined ? 0 : Number(max) + 1;
}

/**
 * Inserts a product at the end of the live. The position is computed on the
 * server; client-supplied position is never trusted. Returns `null` when the
 * live does not belong to the user.
 */
export async function createProduct(
  liveId: string,
  userId: string,
  input: ProductFormData,
): Promise<Product | null> {
  if (!(await isLiveOwnedByUser(liveId, userId))) {
    return null;
  }

  const position = await getNextProductPosition(liveId, userId);

  const [product] = await db
    .insert(products)
    .values({ ...input, liveId, position })
    .returning();

  return product ?? null;
}

/**
 * Inserts several products at the end of the live in a single atomic statement.
 * Positions are computed on the server from the live's current max, contiguous
 * and in the given array order, so the original link order is preserved. A
 * multi-row insert is all-or-nothing: if any row fails, none are persisted
 * (rollback). Returns `null` when the live does not belong to the user.
 */
export async function createProductsBatch(
  liveId: string,
  userId: string,
  inputs: ProductFormData[],
): Promise<{ count: number } | null> {
  if (inputs.length === 0) {
    return { count: 0 };
  }

  if (!(await isLiveOwnedByUser(liveId, userId))) {
    return null;
  }

  const start = await getNextProductPosition(liveId, userId);
  const values = inputs.map((input, index) => ({
    ...input,
    liveId,
    position: start + inputs.length - 1 - index,
  }));

  const inserted = await db
    .insert(products)
    .values(values)
    .returning({ id: products.id });

  return { count: inserted.length };
}

/**
 * Updates a product scoped to its live and owner. `position` is intentionally
 * left untouched. Returns `null` when nothing matched.
 */
export async function updateProduct(
  productId: string,
  liveId: string,
  userId: string,
  input: ProductFormData,
): Promise<Product | null> {
  if (!(await isLiveOwnedByUser(liveId, userId))) {
    return null;
  }

  const [product] = await db
    .update(products)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.liveId, liveId)))
    .returning();

  return product ?? null;
}

/**
 * Deletes a product and reindexes the remaining ones to `0..n-1` in a single
 * atomic batch. Returns `null` when the product does not belong to the user.
 */
export async function deleteProduct(
  productId: string,
  liveId: string,
  userId: string,
): Promise<{ id: string } | null> {
  if (!(await isLiveOwnedByUser(liveId, userId))) {
    return null;
  }

  const ordered = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.liveId, liveId))
    .orderBy(asc(products.position));

  if (!ordered.some((row) => row.id === productId)) {
    return null;
  }

  const remaining = ordered
    .map((row) => row.id)
    .filter((id) => id !== productId);

  const statements = [
    db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.liveId, liveId))),
    ...remaining.map((id, index) =>
      db
        .update(products)
        .set({ position: index })
        .where(and(eq(products.id, id), eq(products.liveId, liveId))),
    ),
  ] as unknown as BatchArg;

  await db.batch(statements);

  return { id: productId };
}

/**
 * Persists a full new order for a live's products. The browser order is never
 * trusted: it must be an exact permutation of the live's product ids (no
 * duplicates, no missing, no extra, none from another live). Positions are
 * reassigned contiguously in a single atomic batch.
 */
export async function reorderProducts(
  liveId: string,
  userId: string,
  orderedProductIds: string[],
): Promise<{ ok: boolean }> {
  if (!(await isLiveOwnedByUser(liveId, userId))) {
    return { ok: false };
  }

  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.liveId, liveId));

  if (
    !isValidReorder(
      existing.map((row) => row.id),
      orderedProductIds,
    )
  ) {
    return { ok: false };
  }

  if (orderedProductIds.length === 0) {
    return { ok: true };
  }

  const now = new Date();
  const statements = orderedProductIds.map((id, index) =>
    db
      .update(products)
      .set({ position: index, updatedAt: now })
      .where(and(eq(products.id, id), eq(products.liveId, liveId))),
  ) as unknown as BatchArg;

  await db.batch(statements);

  return { ok: true };
}
