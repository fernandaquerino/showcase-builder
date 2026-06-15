// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import {
  fetchHtmlWithSafeRedirects,
  type SafeFetchOptions,
} from "./safe-fetch";

const PUBLIC_IP = ["93.184.216.34"];

function baseOptions(
  overrides: Partial<SafeFetchOptions> = {},
): SafeFetchOptions {
  return {
    allowedHosts: new Set(["loja.exemplo.com"]),
    timeoutMs: 8000,
    maxRedirects: 5,
    maxBytes: 1000,
    dnsLookup: async () => PUBLIC_IP,
    ...overrides,
  };
}

function htmlResponse(body: string, contentType = "text/html"): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": contentType } });
}

function redirectResponse(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

const URL_OK = "https://loja.exemplo.com/p/1";

describe("fetchHtmlWithSafeRedirects", () => {
  it("returns HTML on success with the final URL", async () => {
    const fetchImpl = vi.fn(async () => htmlResponse("<html>ok</html>"));

    const result = await fetchHtmlWithSafeRedirects(
      URL_OK,
      baseOptions({ fetchImpl: fetchImpl as unknown as typeof fetch }),
    );

    expect(result).toEqual({
      ok: true,
      sourceUrl: URL_OK,
      finalUrl: URL_OK,
      html: "<html>ok</html>",
    });
  });

  it("rejects an invalid scheme before any fetch", async () => {
    const fetchImpl = vi.fn();
    const result = await fetchHtmlWithSafeRedirects(
      "javascript:alert(1)",
      baseOptions({ fetchImpl: fetchImpl as unknown as typeof fetch }),
    );
    expect(result).toEqual({ ok: false, code: "INVALID_URL" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("blocks when DNS resolves to a private IP", async () => {
    const result = await fetchHtmlWithSafeRedirects(
      URL_OK,
      baseOptions({
        dnsLookup: async () => ["127.0.0.1"],
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    );
    expect(result).toEqual({ ok: false, code: "HOST_NOT_ALLOWED" });
  });

  it("follows an allowed redirect", async () => {
    const responses = [
      redirectResponse("https://loja.exemplo.com/final"),
      htmlResponse("<html>final</html>"),
    ];
    const fetchImpl = vi.fn(async () => responses.shift()!);

    const result = await fetchHtmlWithSafeRedirects(
      URL_OK,
      baseOptions({ fetchImpl: fetchImpl as unknown as typeof fetch }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://loja.exemplo.com/final");
    }
  });

  it("resolves a relative redirect against the current URL", async () => {
    const responses = [
      redirectResponse("/final"),
      htmlResponse("<html>final</html>"),
    ];
    const fetchImpl = vi.fn(async () => responses.shift()!);

    const result = await fetchHtmlWithSafeRedirects(
      URL_OK,
      baseOptions({ fetchImpl: fetchImpl as unknown as typeof fetch }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://loja.exemplo.com/final");
    }
  });

  it("blocks a redirect to a disallowed host", async () => {
    const fetchImpl = vi.fn(async () =>
      redirectResponse("https://evil.example/x"),
    );
    const result = await fetchHtmlWithSafeRedirects(
      URL_OK,
      baseOptions({ fetchImpl: fetchImpl as unknown as typeof fetch }),
    );
    expect(result).toEqual({ ok: false, code: "HOST_NOT_ALLOWED" });
  });

  it("stops after too many redirects", async () => {
    const fetchImpl = vi.fn(async () =>
      redirectResponse("https://loja.exemplo.com/loop"),
    );
    const result = await fetchHtmlWithSafeRedirects(
      URL_OK,
      baseOptions({
        maxRedirects: 2,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    );
    expect(result).toEqual({ ok: false, code: "TOO_MANY_REDIRECTS" });
  });

  it("rejects a non-HTML content type", async () => {
    const fetchImpl = vi.fn(async () =>
      htmlResponse("%PDF-1.4", "application/pdf"),
    );
    const result = await fetchHtmlWithSafeRedirects(
      URL_OK,
      baseOptions({ fetchImpl: fetchImpl as unknown as typeof fetch }),
    );
    expect(result).toEqual({ ok: false, code: "UNSUPPORTED_CONTENT" });
  });

  it("rejects a response larger than the byte limit", async () => {
    const fetchImpl = vi.fn(async () =>
      htmlResponse("x".repeat(5000)),
    );
    const result = await fetchHtmlWithSafeRedirects(
      URL_OK,
      baseOptions({
        maxBytes: 100,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    );
    expect(result).toEqual({ ok: false, code: "RESPONSE_TOO_LARGE" });
  });

  it.each([
    [403, "UPSTREAM_BLOCKED"],
    [429, "UPSTREAM_BLOCKED"],
    [404, "NOT_FOUND"],
    [500, "UPSTREAM_BLOCKED"],
  ])("maps status %s", async (status, code) => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("x", { status, headers: { "content-type": "text/html" } }),
    );
    const result = await fetchHtmlWithSafeRedirects(
      URL_OK,
      baseOptions({ fetchImpl: fetchImpl as unknown as typeof fetch }),
    );
    expect(result).toEqual({ ok: false, code });
  });

  it("returns TIMEOUT when the request is aborted", async () => {
    const fetchImpl = (_url: unknown, init?: { signal?: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });

    const result = await fetchHtmlWithSafeRedirects(
      URL_OK,
      baseOptions({
        timeoutMs: 5,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    );
    expect(result).toEqual({ ok: false, code: "TIMEOUT" });
  });
});
