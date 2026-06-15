import "server-only";

import { createHash } from "node:crypto";

/** SHA-256 (hex) of the full URL, used as the cache key. */
export function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}
