import "server-only";

import { lt, sql } from "drizzle-orm";

import {
  computeWindowStartMs,
  isWithinLimit,
  retryAfterSeconds,
} from "@/server/lib/extract/policy";
import { db } from "@/server/db";
import { extractionRateLimits } from "@/server/db/schema";

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
};

/**
 * Atomically increments the per-user counter for the current fixed window and
 * reports whether the attempt is allowed. Concurrency-safe via a single upsert
 * (`ON CONFLICT ... DO UPDATE`), so it does not rely on process memory.
 */
export async function consumeExtractionAttempt(
  userId: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const windowStartMs = computeWindowStartMs(nowMs, windowMs);
  const windowStart = new Date(windowStartMs);

  const [row] = await db
    .insert(extractionRateLimits)
    .values({ userId, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [extractionRateLimits.userId, extractionRateLimits.windowStart],
      set: { count: sql`${extractionRateLimits.count} + 1` },
    })
    .returning({ count: extractionRateLimits.count });

  const count = row?.count ?? limit + 1;

  return {
    allowed: isWithinLimit(count, limit),
    count,
    retryAfterSeconds: retryAfterSeconds(windowStartMs, windowMs, nowMs),
  };
}

/** Best-effort cleanup of windows older than two windows. */
export async function cleanupExpiredRateLimits(windowMs: number): Promise<void> {
  const cutoff = new Date(Date.now() - windowMs * 2);
  await db
    .delete(extractionRateLimits)
    .where(lt(extractionRateLimits.windowStart, cutoff));
}
