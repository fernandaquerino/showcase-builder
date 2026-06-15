import "server-only";

import type { ExtractionErrorCode } from "@/lib/validations/extract";

/** Maps an extraction error code to its HTTP status (see Phase 3 §5). */
export function httpStatusForError(code: ExtractionErrorCode): number {
  switch (code) {
    case "INVALID_URL":
      return 400;
    case "HOST_NOT_ALLOWED":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "TIMEOUT":
      return 408;
    case "UNSUPPORTED_CONTENT":
      return 415;
    case "NO_PRODUCT_DATA":
      return 422;
    case "RATE_LIMITED":
      return 429;
    case "UPSTREAM_BLOCKED":
    case "TOO_MANY_REDIRECTS":
    case "RESPONSE_TOO_LARGE":
    case "EXTRACTION_FAILED":
      return 502;
  }
}
