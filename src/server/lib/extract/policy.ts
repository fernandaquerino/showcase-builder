import "server-only";

import type { ExtractionErrorCode } from "@/lib/validations/extract";

export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW_MS = 60_000;

const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const TEMPORARY_ERROR_TTL_MS = 10 * 60 * 1000;

export type CacheKind = "success" | "no-data" | "temporary-error";

/** Errors worth caching, and for how long. Pre-network errors are not cached. */
export function cacheKindForError(code: ExtractionErrorCode): CacheKind | null {
  switch (code) {
    case "NO_PRODUCT_DATA":
      return "no-data";
    case "TIMEOUT":
    case "NOT_FOUND":
    case "TOO_MANY_REDIRECTS":
    case "UNSUPPORTED_CONTENT":
    case "RESPONSE_TOO_LARGE":
    case "UPSTREAM_BLOCKED":
    case "EXTRACTION_FAILED":
      return "temporary-error";
    case "INVALID_URL":
    case "HOST_NOT_ALLOWED":
    case "RATE_LIMITED":
      return null;
  }
}

export function ttlMsForCacheKind(kind: CacheKind): number {
  return kind === "temporary-error" ? TEMPORARY_ERROR_TTL_MS : SUCCESS_TTL_MS;
}

export function expiresAtForCacheKind(kind: CacheKind, now = new Date()): Date {
  return new Date(now.getTime() + ttlMsForCacheKind(kind));
}

export function computeWindowStartMs(nowMs: number, windowMs: number): number {
  return Math.floor(nowMs / windowMs) * windowMs;
}

export function retryAfterSeconds(
  windowStartMs: number,
  windowMs: number,
  nowMs: number,
): number {
  return Math.max(1, Math.ceil((windowStartMs + windowMs - nowMs) / 1000));
}

export function isWithinLimit(count: number, limit: number): boolean {
  return count < limit;
}
