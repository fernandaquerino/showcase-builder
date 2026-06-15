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
  type ExtractionCacheRow,
} from "@/server/db/queries/extraction-cache";
import { consumeExtractionAttempt } from "@/server/db/queries/rate-limit";
import { hashUrl } from "@/server/lib/extract/hash";
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
}): ExtractableField[] {
  return EXTRACTABLE_FIELDS.filter((field) => values[field] !== null);
}

function successResponse(
  data: ExtractionSuccessData,
): NextResponse<ExtractionResponse> {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function cacheToResponse(
  cached: ExtractionCacheRow,
): NextResponse<ExtractionResponse> {
  if (cached.status === "error") {
    const code = (cached.errorCode ?? "EXTRACTION_FAILED") as ExtractionErrorCode;
    return jsonError(code);
  }

  return successResponse({
    sourceUrl: cached.sourceUrl,
    finalUrl: cached.finalUrl ?? cached.sourceUrl,
    name: cached.name,
    imageUrl: cached.imageUrl,
    price: cached.price,
    color: cached.color,
    fieldsFound: fieldsFoundFrom(cached),
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

  const canonicalUrl = validation.url.href;
  const host = validation.url.hostname;
  const urlHash = hashUrl(canonicalUrl);

  logExtractionEvent("extraction_started", { host });

  // A valid cache hit never consumes a network rate-limit attempt.
  const cached = await getValidCachedExtraction(urlHash);
  if (cached) {
    logExtractionEvent("cache_hit", { host });
    return cacheToResponse(cached);
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

  const fetched = await fetchHtmlWithSafeRedirects(canonicalUrl, config);
  if (!fetched.ok) {
    await cacheNetworkError(fetched.code, canonicalUrl, urlHash);
    logExtractionEvent(fetched.code === "TIMEOUT" ? "timeout" : "upstream_error", {
      host,
    });
    return jsonError(fetched.code);
  }

  const normalized = normalizeExtractedProduct(
    extractProductMetadata(fetched.html, fetched.finalUrl),
  );

  if (normalized.completeness === null) {
    await upsertExtractionCache({
      urlHash,
      sourceUrl: canonicalUrl,
      finalUrl: fetched.finalUrl,
      name: null,
      imageUrl: null,
      price: null,
      color: null,
      extractionSource: null,
      status: "error",
      errorCode: "NO_PRODUCT_DATA",
      expiresAt: expiresAtForCacheKind("no-data"),
    });
    logExtractionEvent("upstream_error", { host });
    return jsonError("NO_PRODUCT_DATA");
  }

  await upsertExtractionCache({
    urlHash,
    sourceUrl: canonicalUrl,
    finalUrl: fetched.finalUrl,
    name: normalized.name,
    imageUrl: normalized.imageUrl,
    price: normalized.price,
    color: normalized.color,
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
    sourceUrl: canonicalUrl,
    finalUrl: fetched.finalUrl,
    name: normalized.name,
    imageUrl: normalized.imageUrl,
    price: normalized.price,
    color: normalized.color,
    fieldsFound: normalized.fieldsFound,
    extractionSource: normalized.extractionSource,
    completeness: normalized.completeness,
    fromCache: false,
  });
}
