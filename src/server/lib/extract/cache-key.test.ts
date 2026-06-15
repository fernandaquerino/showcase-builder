// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  buildProductCacheKeys,
  initialCacheLookupHashes,
  normalizeUrlForCache,
} from "./cache-key";

describe("normalizeUrlForCache", () => {
  it("removes tracking and fragments but preserves functional parameters", () => {
    expect(
      normalizeUrlForCache(
        "https://LOJA.com/produto//123/?variant=preto&utm_campaign=a&gclid=x#foto",
      ),
    ).toBe("https://loja.com/produto/123?variant=preto");
  });

  it("does not modify the original affiliate URL", () => {
    const affiliate =
      "https://loja.com/p?utm_source=mais&utm_campaign=pam&variant=azul";
    normalizeUrlForCache(affiliate);
    expect(affiliate).toBe(
      "https://loja.com/p?utm_source=mais&utm_campaign=pam&variant=azul",
    );
  });
});

describe("buildProductCacheKeys", () => {
  it("prioritizes SKU, then canonical, final and original", () => {
    const keys = buildProductCacheKeys({
      sku: "ABC-1",
      canonicalUrl: "https://loja.com/p/1?utm_source=x",
      finalUrl: "https://loja.com/p/1?gclid=y",
      affiliateUrl: "https://afiliado.com/r?id=1&utm_campaign=z",
    });
    expect(keys.logicalKeys).toEqual([
      "sku:abc-1",
      "canonical:https://loja.com/p/1",
      "final:https://loja.com/p/1",
      "original:https://afiliado.com/r?id=1",
    ]);
    expect(keys.primaryHash).toBe(keys.lookupHashes[0]);
  });

  it("gives campaign variants the same original lookup key", () => {
    const first = initialCacheLookupHashes(
      "https://loja.com/p/1?utm_campaign=criadora-a&variant=preto",
    );
    const second = initialCacheLookupHashes(
      "https://loja.com/p/1?utm_campaign=criadora-b&variant=preto",
    );
    expect(first[0]).toBe(second[0]);
    expect(first[1]).not.toBe(second[1]);
  });
});
