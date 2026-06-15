import "server-only";

import { and, eq, gt } from "drizzle-orm";

import { db } from "@/server/db";
import { productExtractionCache } from "@/server/db/schema";

export type ExtractionCacheRow = typeof productExtractionCache.$inferSelect;

export type ExtractionCacheInput = {
  urlHash: string;
  sourceUrl: string;
  finalUrl: string | null;
  name: string | null;
  imageUrl: string | null;
  price: string | null;
  color: string | null;
  extractionSource: string | null;
  status: string;
  errorCode: string | null;
  expiresAt: Date;
};

/** Returns a non-expired cache row for the URL hash, or `null`. */
export async function getValidCachedExtraction(
  urlHash: string,
): Promise<ExtractionCacheRow | null> {
  const row = await db.query.productExtractionCache.findFirst({
    where: and(
      eq(productExtractionCache.urlHash, urlHash),
      gt(productExtractionCache.expiresAt, new Date()),
    ),
  });

  return row ?? null;
}

/** Inserts or refreshes a cache entry (keyed by `url_hash`). Never stores HTML. */
export async function upsertExtractionCache(
  input: ExtractionCacheInput,
): Promise<void> {
  const now = new Date();

  await db
    .insert(productExtractionCache)
    .values({ ...input, updatedAt: now })
    .onConflictDoUpdate({
      target: productExtractionCache.urlHash,
      set: {
        sourceUrl: input.sourceUrl,
        finalUrl: input.finalUrl,
        name: input.name,
        imageUrl: input.imageUrl,
        price: input.price,
        color: input.color,
        extractionSource: input.extractionSource,
        status: input.status,
        errorCode: input.errorCode,
        expiresAt: input.expiresAt,
        updatedAt: now,
      },
    });
}
