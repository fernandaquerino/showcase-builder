import "server-only";

import { lookup } from "node:dns/promises";

import { isBlockedIp, validateUrl } from "./url-guard";

export type SafeFetchErrorCode =
  | "INVALID_URL"
  | "HOST_NOT_ALLOWED"
  | "TIMEOUT"
  | "TOO_MANY_REDIRECTS"
  | "UNSUPPORTED_CONTENT"
  | "RESPONSE_TOO_LARGE"
  | "UPSTREAM_BLOCKED"
  | "NOT_FOUND"
  | "EXTRACTION_FAILED";

export type SafeFetchResult =
  | { ok: true; sourceUrl: string; finalUrl: string; html: string }
  | { ok: false; code: SafeFetchErrorCode };

type DnsLookup = (hostname: string) => Promise<string[]>;

export type SafeFetchOptions = {
  allowedHosts: Set<string>;
  timeoutMs: number;
  maxRedirects: number;
  maxBytes: number;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests; defaults to `dns.lookup` returning every address. */
  dnsLookup?: DnsLookup;
};

const USER_AGENT =
  "Mozilla/5.0 (compatible; ShowcaseBuilderBot/1.0; +https://showcase-builder.example)";
const HTML_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];

function stripBrackets(hostname: string): string {
  return hostname.replace(/^\[/, "").replace(/\]$/, "");
}

async function defaultDnsLookup(hostname: string): Promise<string[]> {
  const results = await lookup(hostname, { all: true });
  return results.map((result) => result.address);
}

/**
 * Resolves the hostname and confirms every returned address is a public unicast
 * IP. This is the DNS-rebinding / SSRF defense. Limitation: there is a TOCTOU
 * gap between this lookup and the actual connection (the runtime does not let us
 * pin the socket to the validated IP); documented as a known limitation.
 */
async function isResolvedHostSafe(
  hostname: string,
  dnsLookup: DnsLookup,
): Promise<boolean> {
  let addresses: string[];
  try {
    addresses = await dnsLookup(stripBrackets(hostname));
  } catch {
    return false;
  }

  if (addresses.length === 0) {
    return false;
  }

  return addresses.every((address) => !isBlockedIp(address));
}

async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<
  | { ok: true; html: string }
  | { ok: false; code: "RESPONSE_TOO_LARGE" | "EXTRACTION_FAILED" }
> {
  const body = response.body;

  if (!body) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) {
      return { ok: false, code: "RESPONSE_TOO_LARGE" };
    }
    return { ok: true, html: text };
  }

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let total = 0;
  let html = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          return { ok: false, code: "RESPONSE_TOO_LARGE" };
        }
        html += decoder.decode(value, { stream: true });
      }
    }
  } catch {
    return { ok: false, code: "EXTRACTION_FAILED" };
  }

  html += decoder.decode();
  return { ok: true, html };
}

function mapStatus(status: number): SafeFetchErrorCode | null {
  if (status === 403 || status === 429) {
    return "UPSTREAM_BLOCKED";
  }
  if (status === 404) {
    return "NOT_FOUND";
  }
  if (status >= 500) {
    return "UPSTREAM_BLOCKED";
  }
  if (status < 200 || status >= 300) {
    return "EXTRACTION_FAILED";
  }
  return null;
}

/**
 * Fetches HTML following redirects manually, validating every hop (scheme,
 * allowlist, resolved IP), enforcing a total timeout, a redirect cap, a max
 * response size and an HTML-only Content-Type. Never forwards client cookies,
 * authorization or headers, and never lets the caller pick method/headers.
 */
export async function fetchHtmlWithSafeRedirects(
  rawUrl: string,
  options: SafeFetchOptions,
): Promise<SafeFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const dnsLookup = options.dnsLookup ?? defaultDnsLookup;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    let currentUrl = rawUrl;

    for (let redirects = 0; ; redirects += 1) {
      const validation = validateUrl(currentUrl, options.allowedHosts);
      if (!validation.ok) {
        return { ok: false, code: validation.code };
      }

      const url = validation.url;
      if (!(await isResolvedHostSafe(url.hostname, dnsLookup))) {
        return { ok: false, code: "HOST_NOT_ALLOWED" };
      }

      const response = await fetchImpl(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml",
        },
      });

      const status = response.status;

      if (status >= 300 && status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return { ok: false, code: "EXTRACTION_FAILED" };
        }
        if (redirects >= options.maxRedirects) {
          return { ok: false, code: "TOO_MANY_REDIRECTS" };
        }
        try {
          currentUrl = new URL(location, url).href;
        } catch {
          return { ok: false, code: "INVALID_URL" };
        }
        continue;
      }

      const statusError = mapStatus(status);
      if (statusError) {
        return { ok: false, code: statusError };
      }

      const contentType = (
        response.headers.get("content-type") ?? ""
      ).toLowerCase();
      if (!HTML_CONTENT_TYPES.some((type) => contentType.includes(type))) {
        return { ok: false, code: "UNSUPPORTED_CONTENT" };
      }

      const declaredLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
        return { ok: false, code: "RESPONSE_TOO_LARGE" };
      }

      const body = await readBodyWithLimit(response, options.maxBytes);
      if (!body.ok) {
        return body;
      }

      return {
        ok: true,
        sourceUrl: rawUrl,
        finalUrl: url.href,
        html: body.html,
      };
    }
  } catch {
    if (controller.signal.aborted) {
      return { ok: false, code: "TIMEOUT" };
    }
    return { ok: false, code: "EXTRACTION_FAILED" };
  } finally {
    clearTimeout(timer);
  }
}
