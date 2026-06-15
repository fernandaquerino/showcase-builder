import { describe, expect, it } from "vitest";

import type { ExtractionSuccessData } from "@/lib/validations/extract";
import { itemFromParsedLink, type ImportProductItem } from "@/lib/products/import-item";
import { bulkImportReducer, type BulkImportState } from "./reducer";

const URL_A = "https://www.cea.com.br/a/p";
const URL_B = "https://www.cea.com.br/b/p";

function pendingItem(id: string, url: string): ImportProductItem {
  return itemFromParsedLink(
    { originalIndex: 0, affiliateUrl: url, hostname: "www.cea.com.br", status: "valid" },
    id,
  );
}

function completeExtraction(): ExtractionSuccessData {
  return {
    affiliateUrl: URL_A,
    sourceUrl: URL_A,
    canonicalUrl: URL_A,
    finalUrl: URL_A,
    sku: "SKU",
    name: "Camisa",
    imageUrl: "https://img/x.jpg",
    price: "59.90",
    color: null,
    category: "Camisas",
    brand: null,
    availableSizes: ["P", "M"],
    fieldsFound: ["name", "imageUrl"],
    extractionSource: "json-ld",
    completeness: "complete",
    fromCache: false,
  };
}

function stateWith(items: ImportProductItem[]): BulkImportState {
  return { items };
}

describe("bulkImportReducer", () => {
  it("marks a complete extraction ready and auto-selects it", () => {
    const state = stateWith([pendingItem("1", URL_A)]);
    const next = bulkImportReducer(state, {
      type: "applyExtraction",
      id: "1",
      data: completeExtraction(),
    });
    expect(next.items[0].status).toBe("ready");
    expect(next.items[0].selected).toBe(true);
  });

  it("marks an incomplete extraction needs-review and leaves it unselected", () => {
    const state = stateWith([pendingItem("1", URL_A)]);
    const next = bulkImportReducer(state, {
      type: "applyExtraction",
      id: "1",
      data: { ...completeExtraction(), imageUrl: null, name: null },
    });
    expect(next.items[0].status).toBe("needs-review");
    expect(next.items[0].selected).toBe(false);
  });

  it("does not allow selecting a non-ready item", () => {
    const state = stateWith([pendingItem("1", URL_A)]); // status pending
    const next = bulkImportReducer(state, {
      type: "toggleSelected",
      id: "1",
      selected: true,
    });
    expect(next.items[0].selected).toBe(false);
  });

  it("flips needs-review to ready and selects it after a manual edit", () => {
    let state = stateWith([pendingItem("1", URL_A)]);
    state = bulkImportReducer(state, {
      type: "applyExtraction",
      id: "1",
      data: { ...completeExtraction(), name: null, category: null, imageUrl: null },
    });
    expect(state.items[0].status).toBe("needs-review");

    state = bulkImportReducer(state, {
      type: "edit",
      id: "1",
      patch: { name: "Blusa", category: "Blusas", imageUrl: "https://img/y.jpg" },
    });
    expect(state.items[0].status).toBe("ready");
    expect(state.items[0].selected).toBe(true);
    expect(state.items[0].manuallyEdited).toBe(true);
  });

  it("selects all ready items and clears selection", () => {
    let state = stateWith([pendingItem("1", URL_A), pendingItem("2", URL_B)]);
    state = bulkImportReducer(state, {
      type: "applyExtraction",
      id: "1",
      data: completeExtraction(),
    });
    state = bulkImportReducer(state, { type: "clearSelection" });
    expect(state.items.every((item) => !item.selected)).toBe(true);

    state = bulkImportReducer(state, { type: "selectAllReady" });
    expect(state.items[0].selected).toBe(true); // ready
    expect(state.items[1].selected).toBe(false); // still pending
  });

  it("never auto-fills the size on extraction", () => {
    const state = stateWith([pendingItem("1", URL_A)]);
    const next = bulkImportReducer(state, {
      type: "applyExtraction",
      id: "1",
      data: completeExtraction(),
    });
    expect(next.items[0].size).toBeNull();
    expect(next.items[0].availableSizes).toEqual(["P", "M"]);
  });

  it("removes an item by id", () => {
    const state = stateWith([pendingItem("1", URL_A), pendingItem("2", URL_B)]);
    const next = bulkImportReducer(state, { type: "remove", id: "1" });
    expect(next.items).toHaveLength(1);
    expect(next.items[0].id).toBe("2");
  });
});
