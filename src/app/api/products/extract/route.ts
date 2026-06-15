import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getExtractionConfig } from "@/lib/env";
import { extractionErrorMessage } from "@/lib/extract-messages";
import {
  EXTRACTABLE_FIELDS,
  extractRequestSchema,
  type ExtractableField,
  type ExtractionErrorCode,
  type ExtractionResponse,
  type ExtractionSource,
  type ExtractionSuccessData,
} from "@/lib/validations/extract";
import {
  getValidCachedExtraction,
  upsertExtractionCache,
  type ExtractionCacheMetadata,
  type ExtractionCacheRow,
} from "@/server/db/queries/extraction-cache";
import { consumeExtractionAttempt } from "@/server/db/queries/rate-limit";
import {
  buildProductCacheKeys,
  initialCacheLookupHashes,
} from "@/server/lib/extract/cache-key";
import { httpStatusForError } from "@/server/lib/extract/http";
import { logExtractionEvent } from "@/server/lib/extract/log";
import { normalizeExtractedProduct } from "@/server/lib/extract/normalize";
import { extractProductMetadata } from "@/server/lib/extract/parse";
import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  cacheKindForError,
  expiresAtForCacheKind,
} from "@/server/lib/extract/policy";
import { fetchHtmlWithSafeRedirects } from "@/server/lib/extract/safe-fetch";
import { validateUrl as validateRequestUrl } from "@/server/lib/extract/url-guard";
import { capitalizeFirst } from "@/lib/string";
import { normalizeProductCategory } from "@/lib/validations/product";

// `node:dns` and `node:crypto` require the Node.js runtime (not Edge).
export const runtime = "nodejs";

function jsonError(
  code: ExtractionErrorCode,
  init?: ResponseInit,
): NextResponse<ExtractionResponse> {
  return NextResponse.json(
    { success: false, error: { code, message: extractionErrorMessage(code) } },
    { status: httpStatusForError(code), ...init },
  );
}

function fieldsFoundFrom(values: {
  name: string | null;
  imageUrl: string | null;
  price: string | null;
  color: string | null;
  metadata: ExtractionCacheMetadata | null;
}): ExtractableField[] {
  console.log({ values });

  const metadata = values.metadata;
  const found = {
    name: values.name ? capitalizeFirst(values.name) : null,
    imageUrl: values.imageUrl,
    price: values.price,
    color: values.color,
    category: normalizeProductCategory(metadata?.category),
    brand: metadata?.brand ?? null,
    sku: metadata?.sku ?? null,
    availableSizes: metadata?.availableSizes.length
      ? metadata.availableSizes
      : null,
  };
  return EXTRACTABLE_FIELDS.filter((field) => found[field] !== null);
}

function successResponse(
  data: ExtractionSuccessData,
): NextResponse<ExtractionResponse> {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function firstLookupHash(lookupHashes: string[], fallbackUrl: string): string {
  return lookupHashes[0] ?? fallbackUrl;
}

function isExtractionErrorCode(
  value: string | null,
): value is ExtractionErrorCode {
  return (
    value === "INVALID_URL" ||
    value === "HOST_NOT_ALLOWED" ||
    value === "RATE_LIMITED" ||
    value === "TIMEOUT" ||
    value === "TOO_MANY_REDIRECTS" ||
    value === "UNSUPPORTED_CONTENT" ||
    value === "RESPONSE_TOO_LARGE" ||
    value === "UPSTREAM_BLOCKED" ||
    value === "NOT_FOUND" ||
    value === "NO_PRODUCT_DATA" ||
    value === "EXTRACTION_FAILED"
  );
}

function cacheMetadata(value: unknown): ExtractionCacheMetadata {
  if (!value || typeof value !== "object") {
    return {
      canonicalUrl: null,
      sku: null,
      category: null,
      brand: null,
      availableSizes: [],
      lookupHashes: [],
    };
  }

  const metadata = value as Partial<ExtractionCacheMetadata>;
  return {
    canonicalUrl:
      typeof metadata.canonicalUrl === "string" ? metadata.canonicalUrl : null,
    sku: typeof metadata.sku === "string" ? metadata.sku : null,
    category: typeof metadata.category === "string" ? metadata.category : null,
    brand: typeof metadata.brand === "string" ? metadata.brand : null,
    availableSizes: Array.isArray(metadata.availableSizes)
      ? metadata.availableSizes.filter(
          (size): size is string => typeof size === "string",
        )
      : [],
    lookupHashes: Array.isArray(metadata.lookupHashes)
      ? metadata.lookupHashes.filter(
          (hash): hash is string => typeof hash === "string",
        )
      : [],
  };
}

function cacheToResponse(
  cached: ExtractionCacheRow,
  affiliateUrl: string,
): NextResponse<ExtractionResponse> {
  if (cached.status === "error") {
    const code = isExtractionErrorCode(cached.errorCode)
      ? cached.errorCode
      : "EXTRACTION_FAILED";
    return jsonError(code);
  }

  const metadata = cacheMetadata(cached.metadata);
  return successResponse({
    affiliateUrl,
    sourceUrl: affiliateUrl,
    canonicalUrl: metadata.canonicalUrl,
    finalUrl: cached.finalUrl ?? cached.sourceUrl,
    sku: metadata.sku,
    name: cached.name,
    imageUrl: cached.imageUrl,
    price: cached.price,
    color: cached.color,
    category: metadata.category,
    brand: metadata.brand,
    availableSizes: metadata.availableSizes,
    fieldsFound: fieldsFoundFrom({ ...cached, metadata }),
    extractionSource: (cached.extractionSource ?? "meta") as ExtractionSource,
    completeness: cached.status === "partial" ? "partial" : "complete",
    fromCache: true,
  });
}

async function cacheNetworkError(
  code: ExtractionErrorCode,
  sourceUrl: string,
  urlHash: string,
): Promise<void> {
  const kind = cacheKindForError(code);
  if (!kind) {
    return;
  }

  await upsertExtractionCache({
    urlHash,
    sourceUrl,
    finalUrl: null,
    name: null,
    imageUrl: null,
    price: null,
    color: null,
    metadata: null,
    extractionSource: null,
    status: "error",
    errorCode: code,
    expiresAt: expiresAtForCacheKind(kind),
  });
}

export async function POST(
  request: Request,
): Promise<NextResponse<ExtractionResponse>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EXTRACTION_FAILED",
          message: "Sua sessão expirou. Entre novamente.",
        },
      },
      { status: 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = extractRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("INVALID_URL");
  }

  const config = getExtractionConfig();
  const validation = validateRequestUrl(parsed.data.url, config.allowedHosts);
  if (!validation.ok) {
    if (validation.code === "HOST_NOT_ALLOWED") {
      logExtractionEvent("host_blocked");
    }
    return jsonError(validation.code);
  }

  const affiliateUrl = parsed.data.url;
  const requestUrl = validation.url.href;
  const host = validation.url.hostname;
  const initialHashes = initialCacheLookupHashes(affiliateUrl);

  logExtractionEvent("extraction_started", { host });

  // A valid cache hit never consumes a network rate-limit attempt.
  const cached = await getValidCachedExtraction(initialHashes);
  if (cached) {
    logExtractionEvent("cache_hit", { host });
    return cacheToResponse(cached, affiliateUrl);
  }

  const rate = await consumeExtractionAttempt(
    userId,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rate.allowed) {
    logExtractionEvent("rate_limited", { host });
    return jsonError("RATE_LIMITED", {
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  const fetched = await fetchHtmlWithSafeRedirects(requestUrl, config);
  if (!fetched.ok) {
    await cacheNetworkError(
      fetched.code,
      affiliateUrl,
      firstLookupHash(initialHashes, affiliateUrl),
    );
    logExtractionEvent(
      fetched.code === "TIMEOUT" ? "timeout" : "upstream_error",
      {
        host,
      },
    );
    return jsonError(fetched.code);
  }

  const normalized = normalizeExtractedProduct(
    extractProductMetadata(fetched.html, fetched.finalUrl),
  );

  if (normalized.completeness === null) {
    await upsertExtractionCache({
      urlHash: firstLookupHash(initialHashes, affiliateUrl),
      sourceUrl: affiliateUrl,
      finalUrl: fetched.finalUrl,
      name: null,
      imageUrl: null,
      price: null,
      color: null,
      metadata: null,
      extractionSource: null,
      status: "error",
      errorCode: "NO_PRODUCT_DATA",
      expiresAt: expiresAtForCacheKind("no-data"),
    });
    logExtractionEvent("upstream_error", { host });
    return jsonError("NO_PRODUCT_DATA");
  }

  const cacheKeys = buildProductCacheKeys({
    sku: normalized.sku,
    canonicalUrl: normalized.canonicalUrl,
    finalUrl: fetched.finalUrl,
    affiliateUrl,
  });
  const metadata: ExtractionCacheMetadata = {
    canonicalUrl: normalized.canonicalUrl,
    sku: normalized.sku,
    category: normalized.category,
    brand: normalized.brand,
    availableSizes: normalized.availableSizes,
    lookupHashes: cacheKeys.lookupHashes,
  };

  await upsertExtractionCache({
    urlHash: cacheKeys.primaryHash,
    sourceUrl: affiliateUrl,
    finalUrl: fetched.finalUrl,
    name: normalized.name,
    imageUrl: normalized.imageUrl,
    price: normalized.price,
    color: normalized.color,
    metadata,
    extractionSource: normalized.extractionSource,
    status: normalized.completeness,
    errorCode: null,
    expiresAt: expiresAtForCacheKind("success"),
  });

  logExtractionEvent(
    normalized.completeness === "partial"
      ? "partial_result"
      : "extraction_completed",
    { host },
  );

  return successResponse({
    affiliateUrl,
    sourceUrl: affiliateUrl,
    canonicalUrl: normalized.canonicalUrl,
    finalUrl: fetched.finalUrl,
    sku: normalized.sku,
    name: normalized.name,
    imageUrl: normalized.imageUrl,
    price: normalized.price,
    color: normalized.color,
    category: normalized.category,
    brand: normalized.brand,
    availableSizes: normalized.availableSizes,
    fieldsFound: normalized.fieldsFound,
    extractionSource: normalized.extractionSource,
    completeness: normalized.completeness,
    fromCache: false,
  });
}
