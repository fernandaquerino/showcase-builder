import { createHash } from "node:crypto";

const TRACKING_PARAMETERS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
]);

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeUrlForCache(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/{2,}/g, "/");
  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETERS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();

  return url.href;
}

export type ProductCacheIdentity = {
  sku: string | null;
  canonicalUrl: string | null;
  finalUrl: string;
  affiliateUrl: string;
};

export type ProductCacheKeys = {
  primaryHash: string;
  lookupHashes: string[];
  logicalKeys: string[];
};

export function buildProductCacheKeys(
  identity: ProductCacheIdentity,
): ProductCacheKeys {
  const normalizedCanonical = identity.canonicalUrl
    ? normalizeUrlForCache(identity.canonicalUrl)
    : null;
  const normalizedFinal = normalizeUrlForCache(identity.finalUrl);
  const normalizedAffiliate = normalizeUrlForCache(identity.affiliateUrl);
  const normalizedSku = identity.sku?.trim().toLowerCase() || null;

  const logicalKeys = [
    normalizedSku ? `sku:${normalizedSku}` : null,
    normalizedCanonical ? `canonical:${normalizedCanonical}` : null,
    normalizedFinal ? `final:${normalizedFinal}` : null,
    normalizedAffiliate ? `original:${normalizedAffiliate}` : null,
  ].filter((value): value is string => value !== null);

  return {
    primaryHash: hash(logicalKeys[0] ?? `original:${identity.affiliateUrl}`),
    lookupHashes: [...new Set(logicalKeys.map(hash))],
    logicalKeys,
  };
}

export function initialCacheLookupHashes(affiliateUrl: string): string[] {
  const normalized = normalizeUrlForCache(affiliateUrl);
  if (!normalized) {
    return [];
  }

  return [hash(`original:${normalized}`), hash(affiliateUrl)];
}
