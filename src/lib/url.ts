/**
 * Returns `true` only for absolute `http(s)` URLs. Rejects unsafe or
 * non-navigable schemes such as `javascript:`, `data:` and `file:`, which is
 * important because these URLs are later rendered as image sources and links.
 */
export function isSafeHttpUrl(value: string): boolean {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * Builds a stable key for comparing two URLs for equality (exact-duplicate and
 * "already in the live" checks). Scheme and host are lowercased and a trailing
 * slash is dropped, but the query string is preserved — affiliate UTMs are part
 * of what makes two links the same product link, and must never be stripped
 * from the URL that gets saved.
 */
export function normalizeUrlForComparison(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  const path = url.pathname.endsWith("/") && url.pathname !== "/"
    ? url.pathname.slice(0, -1)
    : url.pathname;

  return `${url.protocol}//${url.hostname.toLowerCase()}${path}${url.search}`;
}
