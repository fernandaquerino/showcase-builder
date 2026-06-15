import "server-only";

/**
 * Returns a log-safe representation of a URL: scheme + host + path only, with
 * the query string and any embedded credentials stripped. Never log full URLs,
 * cookies, headers, tokens or HTML.
 */
export function safeUrlForLog(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

export type ExtractionLogEvent =
  | "extraction_started"
  | "cache_hit"
  | "extraction_completed"
  | "partial_result"
  | "timeout"
  | "host_blocked"
  | "rate_limited"
  | "upstream_error";

/** Logs an extraction event without any sensitive detail. */
export function logExtractionEvent(
  event: ExtractionLogEvent,
  context: { host?: string } = {},
): void {
  console.info(
    "[extraction]",
    event,
    context.host ? { host: context.host } : {},
  );
}
