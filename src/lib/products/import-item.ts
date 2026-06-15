import { capitalizeFirst } from "@/lib/string";
import type { ExtractionSuccessData } from "@/lib/validations/extract";
import {
  normalizeProductCategory,
  type ProductFormValues,
} from "@/lib/validations/product";
import type { ParsedLink } from "./parse-links";

/** Canonical decimal price (e.g. "129.90") → BR form input ("129,90"). */
function canonicalPriceToInput(price: string | null): string {
  return price ? price.replace(".", ",") : "";
}

export type ImportProductStatus =
  | "pending"
  | "extracting"
  | "ready"
  | "needs-review"
  | "failed"
  | "duplicate"
  | "already-added"
  | "saving"
  | "saved";

export type ImportProductItem = {
  id: string;
  originalIndex: number;
  affiliateUrl: string;
  canonicalUrl: string | null;
  sku: string | null;
  name: string;
  category: string;
  size: string | null;
  color: string | null;
  price: string | null;
  imageUrl: string;
  availableSizes: string[];
  status: ImportProductStatus;
  selected: boolean;
  errorMessage: string | null;
  manuallyEdited: boolean;
};

/** Fields edited inline or in the sheet (everything except identity/status). */
export type ImportItemPatch = Partial<
  Pick<
    ImportProductItem,
    "name" | "category" | "size" | "color" | "price" | "imageUrl"
  >
>;

/** Minimum fields required before a product can be saved. */
export function isItemReady(item: ImportProductItem): boolean {
  return (
    item.name.trim().length >= 2 &&
    item.category.trim().length >= 2 &&
    item.imageUrl.trim().length > 0 &&
    item.affiliateUrl.trim().length > 0
  );
}

/**
 * Recomputes the status from the item's data, unless it is in a terminal/active
 * state (failed, saving, saved, duplicate-related) that should not flip just
 * because a field changed.
 */
export function statusForItem(item: ImportProductItem): ImportProductStatus {
  if (
    item.status === "failed" ||
    item.status === "saving" ||
    item.status === "saved" ||
    item.status === "already-added" ||
    item.status === "duplicate"
  ) {
    return item.status;
  }
  return isItemReady(item) ? "ready" : "needs-review";
}

/** Builds the initial item for a parsed link (only `valid`/`already-added`). */
export function itemFromParsedLink(link: ParsedLink, id: string): ImportProductItem {
  return {
    id,
    originalIndex: link.originalIndex,
    affiliateUrl: link.affiliateUrl,
    canonicalUrl: null,
    sku: null,
    name: "",
    category: "",
    size: null,
    color: null,
    price: null,
    imageUrl: "",
    availableSizes: [],
    status: link.status === "already-added" ? "already-added" : "pending",
    selected: false,
    errorMessage: null,
    manuallyEdited: false,
  };
}

/**
 * Merges extracted data into an item without overwriting fields the creator has
 * already edited by hand. The size used in the live is never auto-filled — only
 * the available sizes are recorded as suggestions.
 */
export function applyExtractionToItem(
  item: ImportProductItem,
  data: ExtractionSuccessData,
): ImportProductItem {
  const extractedName = data.name ? capitalizeFirst(data.name) : null;
  const extractedCategory = normalizeProductCategory(data.category);

  const next: ImportProductItem = {
    ...item,
    canonicalUrl: data.canonicalUrl ?? item.canonicalUrl,
    sku: data.sku ?? item.sku,
    name:
      item.manuallyEdited && item.name ? item.name : extractedName ?? item.name,
    category:
      item.manuallyEdited && item.category
        ? item.category
        : extractedCategory ?? item.category,
    color: item.manuallyEdited && item.color ? item.color : data.color ?? item.color,
    price: item.manuallyEdited && item.price ? item.price : data.price ?? item.price,
    imageUrl:
      item.manuallyEdited && item.imageUrl
        ? item.imageUrl
        : data.imageUrl ?? item.imageUrl,
    availableSizes: data.availableSizes.length
      ? data.availableSizes
      : item.availableSizes,
    errorMessage: null,
  };

  const status = statusForItem(next);
  return { ...next, status, selected: status === "ready" };
}

/** Converts a reviewed item into the form payload the batch action expects. */
export function itemToFormValues(item: ImportProductItem): ProductFormValues {
  return {
    name: item.name,
    category: item.category,
    size: item.size ?? "",
    color: item.color ?? "",
    imageUrl: item.imageUrl,
    productUrl: item.affiliateUrl,
    // item.price is a canonical decimal ("129.90"); the schema expects BR input
    // ("129,90"), where "." is a thousands separator. Convert before saving.
    price: canonicalPriceToInput(item.price),
    sourceUrl: item.affiliateUrl,
  };
}

export type ImportCounts = {
  total: number;
  ready: number;
  needsReview: number;
  failed: number;
  duplicates: number;
  selected: number;
};

export function countItems(items: ImportProductItem[]): ImportCounts {
  return items.reduce<ImportCounts>(
    (acc, item) => {
      acc.total += 1;
      if (item.selected) acc.selected += 1;
      if (item.status === "ready") acc.ready += 1;
      else if (item.status === "needs-review") acc.needsReview += 1;
      else if (item.status === "failed") acc.failed += 1;
      else if (item.status === "already-added" || item.status === "duplicate")
        acc.duplicates += 1;
      return acc;
    },
    { total: 0, ready: 0, needsReview: 0, failed: 0, duplicates: 0, selected: 0 },
  );
}
