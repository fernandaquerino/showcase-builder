import "server-only";

import type {
  ExtractableField,
  ExtractionSource,
} from "@/lib/validations/extract";
import { decodeHtmlEntities } from "@/lib/string";
import { normalizeUrlForCache } from "./cache-key";
import { parseHttpUrl } from "./url-guard";

const LIMITS = {
  name: 160,
  color: 50,
  category: 60,
  brand: 100,
  sku: 100,
  size: 30,
} as const;

export type RawProductMetadata = {
  canonicalUrl: string | null;
  sku: string | null;
  name: string | null;
  imageUrl: string | null;
  price: string | number | null;
  color: string | null;
  category: string | null;
  brand: string | null;
  availableSizes: string[];
  sources: Set<ExtractionSource>;
};

export type NormalizedProduct = Omit<
  RawProductMetadata,
  "price" | "sources"
> & {
  price: string | null;
  fieldsFound: ExtractableField[];
  extractionSource: ExtractionSource;
  completeness: "complete" | "partial" | null;
};

function cleanText(value: string | null, maxLength: number): string | null {
  const cleaned = value
    ? decodeHtmlEntities(value)
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength)
        .trim()
    : null;
  return cleaned || null;
}

export function normalizeExtractedPrice(
  input: string | number | null | undefined,
): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    return Number.isFinite(input) && input >= 0 ? input.toFixed(2) : null;
  }

  const trimmed = input.trim();
  if (trimmed === "" || trimmed.includes("-")) return null;

  const cleaned = trimmed.replace(/[^\d.,]/g, "");
  if (cleaned === "") return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let decimal: string;

  if (hasComma && hasDot) {
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
  return Number.isFinite(numeric) && numeric >= 0 ? numeric.toFixed(2) : null;
}

function normalizeHttpUrl(value: string | null): string | null {
  if (value === null) return null;
  return parseHttpUrl(value.trim())?.href ?? null;
}

function pickExtractionSource(
  sources: Set<ExtractionSource>,
): ExtractionSource {
  if (sources.size === 0) return "meta";
  if (sources.size > 1) return "mixed";
  return [...sources][0];
}

function normalizeSizes(sizes: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const size of sizes) {
    const cleaned = cleanText(size, LIMITS.size);
    if (!cleaned) continue;
    const key = cleaned.toLocaleLowerCase("pt-BR");
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(cleaned);
    }
  }

  return normalized.slice(0, 30);
}

export function normalizeExtractedProduct(
  raw: RawProductMetadata,
): NormalizedProduct {
  const canonicalUrl = raw.canonicalUrl
    ? normalizeUrlForCache(raw.canonicalUrl)
    : null;
  const sku = cleanText(raw.sku, LIMITS.sku);
  const name = cleanText(raw.name, LIMITS.name);
  const imageUrl = normalizeHttpUrl(raw.imageUrl);
  const price = normalizeExtractedPrice(raw.price);
  const color = cleanText(raw.color, LIMITS.color);
  const category = cleanText(raw.category, LIMITS.category);
  const brand = cleanText(raw.brand, LIMITS.brand);
  const availableSizes = normalizeSizes(raw.availableSizes);

  const values: Record<ExtractableField, unknown> = {
    name,
    imageUrl,
    price,
    color,
    category,
    brand,
    sku,
    availableSizes: availableSizes.length > 0 ? availableSizes : null,
  };
  const fieldsFound = Object.entries(values)
    .filter(([, value]) => value !== null)
    .map(([field]) => field as ExtractableField);

  return {
    canonicalUrl,
    sku,
    name,
    imageUrl,
    price,
    color,
    category,
    brand,
    availableSizes,
    fieldsFound,
    extractionSource: pickExtractionSource(raw.sources),
    completeness:
      name && imageUrl ? "complete" : name || imageUrl ? "partial" : null,
  };
}
