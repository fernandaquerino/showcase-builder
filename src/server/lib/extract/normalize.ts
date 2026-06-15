import "server-only";

import type {
  ExtractableField,
  ExtractionSource,
} from "@/lib/validations/extract";
import { parseHttpUrl } from "./url-guard";

const NAME_MAX_LENGTH = 160;
const COLOR_MAX_LENGTH = 50;

/** Raw, pre-normalization fields produced by the parser. */
export type RawProductMetadata = {
  name: string | null;
  imageUrl: string | null;
  price: string | number | null;
  color: string | null;
  /** Which strategies contributed at least one field. */
  sources: Set<ExtractionSource>;
};

export type NormalizedProduct = {
  name: string | null;
  imageUrl: string | null;
  price: string | null;
  color: string | null;
  fieldsFound: ExtractableField[];
  extractionSource: ExtractionSource;
  /** `null` means no useful data (no name and no image) — i.e. NO_PRODUCT_DATA. */
  completeness: "complete" | "partial" | null;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanText(value: string | null, maxLength: number): string | null {
  if (value === null) {
    return null;
  }
  const cleaned = collapseWhitespace(value).slice(0, maxLength).trim();
  return cleaned === "" ? null : cleaned;
}

/**
 * Normalizes a price from JSON-LD / Open Graph (number, `"199.90"`,
 * `"R$ 199,90"`, `"1.299,90"`, …) into a canonical decimal string, never a
 * float for persistence. Returns `null` for negative, missing or invalid input.
 */
export function normalizeExtractedPrice(
  input: string | number | null | undefined,
): string | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input === "number") {
    return Number.isFinite(input) && input >= 0 ? input.toFixed(2) : null;
  }

  const trimmed = input.trim();
  if (trimmed === "" || trimmed.includes("-")) {
    return null;
  }

  const cleaned = trimmed.replace(/[^\d.,]/g, "");
  if (cleaned === "") {
    return null;
  }

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let decimal: string;

  if (hasComma && hasDot) {
    // The right-most separator is the decimal one.
    decimal =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(/,/g, ".")
        : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    const parts = cleaned.split(",");
    decimal =
      parts.length === 2 && parts[1].length <= 2
        ? cleaned.replace(/,/g, ".")
        : cleaned.replace(/,/g, "");
  } else if (hasDot) {
    const parts = cleaned.split(".");
    decimal =
      parts.length === 2 && parts[1].length <= 2
        ? cleaned
        : cleaned.replace(/\./g, "");
  } else {
    decimal = cleaned;
  }

  const numeric = Number(decimal);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return numeric.toFixed(2);
}

function normalizeImageUrl(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const url = parseHttpUrl(value.trim());
  return url ? url.href : null;
}

function pickExtractionSource(sources: Set<ExtractionSource>): ExtractionSource {
  if (sources.size === 0) {
    return "meta";
  }
  if (sources.size > 1) {
    return "mixed";
  }
  return [...sources][0];
}

/**
 * Cleans and validates raw parser output. Decodes/trims text, enforces schema
 * limits, validates URLs and the price, and classifies completeness. A result
 * is useful when it has at least a name or an image.
 */
export function normalizeExtractedProduct(
  raw: RawProductMetadata,
): NormalizedProduct {
  const name = cleanText(raw.name, NAME_MAX_LENGTH);
  const color = cleanText(raw.color, COLOR_MAX_LENGTH);
  const imageUrl = normalizeImageUrl(raw.imageUrl);
  const price = normalizeExtractedPrice(raw.price);

  const fieldsFound: ExtractableField[] = [];
  if (name) fieldsFound.push("name");
  if (imageUrl) fieldsFound.push("imageUrl");
  if (price) fieldsFound.push("price");
  if (color) fieldsFound.push("color");

  let completeness: NormalizedProduct["completeness"];
  if (name && imageUrl) {
    completeness = "complete";
  } else if (name || imageUrl) {
    completeness = "partial";
  } else {
    completeness = null;
  }

  return {
    name,
    imageUrl,
    price,
    color,
    fieldsFound,
    extractionSource: pickExtractionSource(raw.sources),
    completeness,
  };
}
