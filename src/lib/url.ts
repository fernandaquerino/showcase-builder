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
