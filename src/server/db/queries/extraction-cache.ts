import "server-only";

import { and, gt, inArray, or, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { productExtractionCache } from "@/server/db/schema";

export type ExtractionCacheRow = typeof productExtractionCache.$inferSelect;

export type ExtractionCacheMetadata = {
  canonicalUrl: string | null;
  sku: string | null;
  category: string | null;
  brand: string | null;
  availableSizes: string[];
  lookupHashes: string[];
};

export type ExtractionCacheInput = {
  urlHash: string;
  sourceUrl: string;
  finalUrl: string | null;
  name: string | null;
  imageUrl: string | null;
  price: string | null;
  color: string | null;
  metadata: ExtractionCacheMetadata | null;
  extractionSource: string | null;
  status: string;
  errorCode: string | null;
  expiresAt: Date;
};

/** Finds a non-expired row by its primary hash or any metadata alias hash. */
export async function getValidCachedExtraction(
  lookupHashes: string[],
): Promise<ExtractionCacheRow | null> {
  if (lookupHashes.length === 0) {
    return null;
  }

  const hashArray = sql`ARRAY[${sql.join(
    lookupHashes.map((hash) => sql`${hash}`),
    sql`, `,
  )}]::text[]`;

  const row = await db.query.productExtractionCache.findFirst({
    where: and(
      or(
        inArray(productExtractionCache.urlHash, lookupHashes),
        sql`coalesce(${productExtractionCache.metadata}->'lookupHashes', '[]'::jsonb) ?| ${hashArray}`,
      ),
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
        metadata: input.metadata,
        extractionSource: input.extractionSource,
        status: input.status,
        errorCode: input.errorCode,
        expiresAt: input.expiresAt,
        updatedAt: now,
      },
    });
}
