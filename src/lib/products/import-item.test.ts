import { describe, expect, it } from "vitest";

import type { ExtractionSuccessData } from "@/lib/validations/extract";
import {
  applyExtractionToItem,
  isItemReady,
  itemFromParsedLink,
  itemToFormValues,
  type ImportProductItem,
} from "./import-item";

const AFFILIATE = "https://www.cea.com.br/produto/p?utm_campaign=pambraga";

function baseItem(overrides: Partial<ImportProductItem> = {}): ImportProductItem {
  return {
    ...itemFromParsedLink(
      { originalIndex: 0, affiliateUrl: AFFILIATE, hostname: "www.cea.com.br", status: "valid" },
      "item-1",
    ),
    ...overrides,
  };
}

function extraction(overrides: Partial<ExtractionSuccessData> = {}): ExtractionSuccessData {
  return {
    affiliateUrl: AFFILIATE,
    sourceUrl: AFFILIATE,
    canonicalUrl: "https://www.cea.com.br/produto/p",
    finalUrl: "https://www.cea.com.br/produto/p",
    sku: "SKU123",
    name: "Vestido floral",
    imageUrl: "https://img.cea.com.br/vestido.jpg",
    price: "129.90",
    color: "Verde",
    category: "Vestidos",
    brand: "C&A",
    availableSizes: ["PP", "P", "M", "G"],
    fieldsFound: ["name", "imageUrl", "price"],
    extractionSource: "json-ld",
    completeness: "complete",
    fromCache: false,
    ...overrides,
  };
}

describe("applyExtractionToItem", () => {
  it("fills extracted fields and marks a complete item ready + selected", () => {
    const result = applyExtractionToItem(baseItem(), extraction());

    expect(result.name).toBe("Vestido floral");
    expect(result.category).toBe("Vestidos");
    expect(result.imageUrl).toBe("https://img.cea.com.br/vestido.jpg");
    expect(result.price).toBe("129.90");
    expect(result.status).toBe("ready");
    expect(result.selected).toBe(true);
  });

  it("records available sizes but never auto-fills the size used in the live", () => {
    const result = applyExtractionToItem(baseItem(), extraction());

    expect(result.availableSizes).toEqual(["PP", "P", "M", "G"]);
    expect(result.size).toBeNull();
  });

  it("preserves the affiliate URL verbatim into the form payload", () => {
    const result = applyExtractionToItem(baseItem(), extraction());
    const form = itemToFormValues(result);

    expect(form.productUrl).toBe(AFFILIATE);
    expect(form.sourceUrl).toBe(AFFILIATE);
  });

  it("does not overwrite manually edited fields", () => {
    const edited = baseItem({ name: "Meu nome", manuallyEdited: true });
    const result = applyExtractionToItem(edited, extraction());

    expect(result.name).toBe("Meu nome");
  });

  it("marks an item missing fields as needs-review and unselected", () => {
    const result = applyExtractionToItem(
      baseItem(),
      extraction({ imageUrl: null, name: null, category: null }),
    );

    expect(result.status).toBe("needs-review");
    expect(result.selected).toBe(false);
  });
});

describe("isItemReady", () => {
  it("requires name, category, image and affiliate url", () => {
    expect(
      isItemReady(
        baseItem({ name: "Camisa", category: "Camisas", imageUrl: "https://x/y.jpg" }),
      ),
    ).toBe(true);
    expect(isItemReady(baseItem({ name: "Camisa" }))).toBe(false);
  });
});
