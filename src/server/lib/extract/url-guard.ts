import "server-only";

import ipaddr from "ipaddr.js";

export type UrlGuardErrorCode = "INVALID_URL" | "HOST_NOT_ALLOWED";

export type UrlGuardResult =
  | { ok: true; url: URL }
  | { ok: false; code: UrlGuardErrorCode };

/** Removes the surrounding brackets from an IPv6 hostname (`[::1]` -> `::1`). */
function stripBrackets(hostname: string): string {
  return hostname.replace(/^\[/, "").replace(/\]$/, "");
}

function rangeIsPublicUnicast(addr: ipaddr.IPv4 | ipaddr.IPv6): boolean {
  return addr.range() === "unicast";
}

/**
 * Returns `true` for any IP that must never be fetched: loopback, private,
 * link-local (incl. `169.254.169.254` cloud metadata), unique-local, reserved,
 * multicast, etc. Unparseable input is treated as blocked. IPv4-mapped IPv6
 * addresses are unwrapped and classified as IPv4.
 */
export function isBlockedIp(ip: string): boolean {
  const candidate = stripBrackets(ip);

  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    addr = ipaddr.parse(candidate);
  } catch {
    return true;
  }

  if (addr.kind() === "ipv6") {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      return !rangeIsPublicUnicast(v6.toIPv4Address());
    }
  }

  return !rangeIsPublicUnicast(addr);
}

/**
 * Parses an absolute `http(s)` URL, rejecting embedded credentials and any
 * non-http scheme (`javascript:`, `data:`, `file:`, `ftp:`, `blob:`, …).
 */
export function parseHttpUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  if (url.username !== "" || url.password !== "") {
    return null;
  }

  if (url.hostname === "") {
    return null;
  }

  return url;
}

/**
 * Exact, case-insensitive hostname match against the allowlist. An empty
 * allowlist never matches (extraction stays disabled). Subdomains are not
 * implied, so `cea.com.br.evil.example` cannot match `cea.com.br`.
 */
export function isHostAllowed(
  hostname: string,
  allowedHosts: Set<string>,
): boolean {
  if (allowedHosts.size === 0) {
    return false;
  }

  return allowedHosts.has(hostname.toLowerCase());
}

/**
 * Synchronous URL validation: scheme, credentials, blocked IP literals and
 * allowlist. DNS resolution and per-hop IP classification happen in the safe
 * fetch layer.
 */
export function validateUrl(
  raw: string,
  allowedHosts: Set<string>,
): UrlGuardResult {
  const url = parseHttpUrl(raw);
  if (!url) {
    return { ok: false, code: "INVALID_URL" };
  }

  const host = stripBrackets(url.hostname);

  // Block IP literals (incl. IPv6) before they reach the allowlist.
  if (ipaddr.isValid(host) && isBlockedIp(host)) {
    return { ok: false, code: "HOST_NOT_ALLOWED" };
  }

  if (!isHostAllowed(url.hostname, allowedHosts)) {
    return { ok: false, code: "HOST_NOT_ALLOWED" };
  }

  return { ok: true, url };
}
