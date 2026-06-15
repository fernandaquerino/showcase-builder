// @vitest-environment node
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { auth } from "@/lib/auth";
import { getExtractionConfig } from "@/lib/env";
import {
  getValidCachedExtraction,
  upsertExtractionCache,
} from "@/server/db/queries/extraction-cache";
import { consumeExtractionAttempt } from "@/server/db/queries/rate-limit";
import { extractProductMetadata } from "@/server/lib/extract/parse";
import { fetchHtmlWithSafeRedirects } from "@/server/lib/extract/safe-fetch";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/env", () => ({ getExtractionConfig: vi.fn() }));
vi.mock("@/server/db/queries/extraction-cache", () => ({
  getValidCachedExtraction: vi.fn(),
  upsertExtractionCache: vi.fn(),
}));
vi.mock("@/server/db/queries/rate-limit", () => ({
  consumeExtractionAttempt: vi.fn(),
}));
vi.mock("@/server/lib/extract/safe-fetch", () => ({
  fetchHtmlWithSafeRedirects: vi.fn(),
}));
vi.mock("@/server/lib/extract/parse", () => ({
  extractProductMetadata: vi.fn(),
}));

const authMock = auth as unknown as Mock;
const USER_ID = "11111111-1111-4111-a111-111111111111";
const URL_OK = "https://loja.exemplo.com/p/1";

function request(body: unknown): Request {
  return new Request("http://localhost/api/products/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function signedIn() {
  authMock.mockResolvedValue({ user: { id: USER_ID }, expires: "" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getExtractionConfig).mockReturnValue({
    allowedHosts: new Set(["loja.exemplo.com"]),
    timeoutMs: 8000,
    maxRedirects: 5,
    maxBytes: 1_048_576,
  });
  vi.mocked(getValidCachedExtraction).mockResolvedValue(null);
  vi.mocked(consumeExtractionAttempt).mockResolvedValue({
    allowed: true,
    count: 1,
    retryAfterSeconds: 60,
  });
  vi.mocked(upsertExtractionCache).mockResolvedValue();
});

describe("POST /api/products/extract", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(request({ url: URL_OK }));
    expect(res.status).toBe(401);
    expect(fetchHtmlWithSafeRedirects).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    signedIn();
    const res = await POST(request({}));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error.code).toBe("INVALID_URL");
  });

  it("returns 403 for a host outside the allowlist", async () => {
    signedIn();
    const res = await POST(request({ url: "https://outra-loja.com/p" }));
    expect(res.status).toBe(403);
    expect(consumeExtractionAttempt).not.toHaveBeenCalled();
  });

  it("returns a cache hit without consuming a rate-limit attempt", async () => {
    signedIn();
    vi.mocked(getValidCachedExtraction).mockResolvedValue({
      id: "c1",
      urlHash: "h",
      sourceUrl: URL_OK,
      finalUrl: "https://loja.exemplo.com/final",
      name: "Jaqueta",
      imageUrl: "https://a/x.jpg",
      price: "199.90",
      color: "Azul",
      extractionSource: "json-ld",
      status: "complete",
      errorCode: null,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(request({ url: URL_OK }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.fromCache).toBe(true);
    expect(json.data.name).toBe("Jaqueta");
    expect(consumeExtractionAttempt).not.toHaveBeenCalled();
    expect(fetchHtmlWithSafeRedirects).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    signedIn();
    vi.mocked(consumeExtractionAttempt).mockResolvedValue({
      allowed: false,
      count: 11,
      retryAfterSeconds: 30,
    });

    const res = await POST(request({ url: URL_OK }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(fetchHtmlWithSafeRedirects).not.toHaveBeenCalled();
  });

  it("extracts a complete product", async () => {
    signedIn();
    vi.mocked(fetchHtmlWithSafeRedirects).mockResolvedValue({
      ok: true,
      sourceUrl: URL_OK,
      finalUrl: URL_OK,
      html: "<html></html>",
    });
    vi.mocked(extractProductMetadata).mockReturnValue({
      name: "Jaqueta",
      imageUrl: "https://a/x.jpg",
      price: "199.90",
      color: "Azul",
      sources: new Set(["json-ld"]),
    });

    const res = await POST(request({ url: URL_OK }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.completeness).toBe("complete");
    expect(json.data.fromCache).toBe(false);
    expect(json.data.fieldsFound).toContain("name");
    expect(upsertExtractionCache).toHaveBeenCalledTimes(1);
  });

  it("returns 422 when there is no name or image", async () => {
    signedIn();
    vi.mocked(fetchHtmlWithSafeRedirects).mockResolvedValue({
      ok: true,
      sourceUrl: URL_OK,
      finalUrl: URL_OK,
      html: "<html></html>",
    });
    vi.mocked(extractProductMetadata).mockReturnValue({
      name: null,
      imageUrl: null,
      price: "10.00",
      color: null,
      sources: new Set(),
    });

    const res = await POST(request({ url: URL_OK }));
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.error.code).toBe("NO_PRODUCT_DATA");
  });

  it.each([
    ["TIMEOUT", 408],
    ["UPSTREAM_BLOCKED", 502],
  ] as const)("maps fetch error %s to %s", async (code, status) => {
    signedIn();
    vi.mocked(fetchHtmlWithSafeRedirects).mockResolvedValue({ ok: false, code });

    const res = await POST(request({ url: URL_OK }));
    const json = await res.json();

    expect(res.status).toBe(status);
    expect(json.error.code).toBe(code);
    // No internal detail leaks — only a friendly message.
    expect(typeof json.error.message).toBe("string");
    expect(json.error.message).not.toMatch(/Error|stack|sql|select/i);
  });
});
