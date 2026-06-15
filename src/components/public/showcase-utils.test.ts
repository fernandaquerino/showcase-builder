import { describe, expect, it } from "vitest";

import {
  buildWhatsAppShareUrl,
  deriveCategoryOptions,
  productCtaLabel,
  productMatchesCategory,
} from "./showcase-utils";

describe("showcase utils", () => {
  it("derives sorted category options and merges duplicates", () => {
    expect(
      deriveCategoryOptions([
        { category: " Jaquetas " },
        { category: "blusas" },
        { category: "jaquetas" },
        { category: "" },
      ]),
    ).toEqual([
      { label: "blusas", count: 1 },
      { label: "Jaquetas", count: 2 },
    ]);
  });

  it("matches all products or a selected category", () => {
    const product = { category: "Jaquetas" };

    expect(productMatchesCategory(product, "Tudo")).toBe(true);
    expect(productMatchesCategory(product, "jaquetas")).toBe(true);
    expect(productMatchesCategory(product, "Blusas")).toBe(false);
  });

  it("builds an encoded WhatsApp share URL", () => {
    expect(buildWhatsAppShareUrl("https://exemplo.com/pam braga")).toBe(
      "https://wa.me/?text=Olha%20os%20produtos%20desta%20live%3A%20https%3A%2F%2Fexemplo.com%2Fpam%20braga",
    );
  });

  it("uses a C&A-specific CTA only for C&A stores", () => {
    expect(productCtaLabel("C&A")).toBe("Ver na C&A");
    expect(productCtaLabel("Outra loja")).toBe("Ver produto");
  });
});
