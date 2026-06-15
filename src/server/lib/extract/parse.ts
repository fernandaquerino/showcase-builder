import "server-only";

import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

import type { ExtractionSource } from "@/lib/validations/extract";
import type { RawProductMetadata } from "./normalize";

const GENERIC_CATEGORIES = new Set([
  "home",
  "início",
  "inicio",
  "feminino",
  "masculino",
  "produtos",
  "produto",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asPrice(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return asText(value);
}

function typeMatches(typeField: unknown, target: string): boolean {
  const normalizedTarget = target.toLowerCase();
  if (typeof typeField === "string") {
    return typeField.toLowerCase() === normalizedTarget;
  }
  return (
    Array.isArray(typeField) &&
    typeField.some(
      (type) =>
        typeof type === "string" && type.toLowerCase() === normalizedTarget,
    )
  );
}

function flattenJsonLd(parsed: unknown): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];

  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (isRecord(node)) {
      nodes.push(node);
      if (Array.isArray(node["@graph"])) {
        node["@graph"].forEach(visit);
      }
    }
  };

  visit(parsed);
  return nodes;
}

function readJsonLdNodes($: CheerioAPI): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text();
    if (!raw.trim()) return;
    try {
      nodes.push(...flattenJsonLd(JSON.parse(raw)));
    } catch {
      // A malformed block must not prevent other structured data from working.
    }
  });

  return nodes;
}

function firstImage(value: unknown): string | null {
  if (typeof value === "string") return asText(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = firstImage(item);
      if (image) return image;
    }
  }
  if (isRecord(value)) {
    return asText(value.url) ?? asText(value.contentUrl);
  }
  return null;
}

function textValues(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/[,|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.flatMap(textValues);
  }
  if (isRecord(value)) {
    return textValues(value.name ?? value.value);
  }
  return [];
}

function pickPrice(node: Record<string, unknown>): string | number | null {
  const direct = asPrice(node.price) ?? asPrice(node.lowPrice);
  if (direct !== null) return direct;
  return isRecord(node.priceSpecification)
    ? asPrice(node.priceSpecification.price)
    : null;
}

function offerPrice(offers: unknown): string | number | null {
  const list = Array.isArray(offers) ? offers : [offers];
  for (const offer of list) {
    if (isRecord(offer)) {
      const price = pickPrice(offer);
      if (price !== null) return price;
    }
  }
  return null;
}

function brandName(brand: unknown): string | null {
  return asText(brand) ?? (isRecord(brand) ? asText(brand.name) : null);
}

export type JsonLdProduct = {
  name: string | null;
  image: string | null;
  price: string | number | null;
  color: string | null;
  category: string | null;
  sku: string | null;
  brand: string | null;
  sizes: string[];
  url: string | null;
};

export function extractJsonLdProduct($: CheerioAPI): JsonLdProduct | null {
  const product = readJsonLdNodes($).find((node) =>
    typeMatches(node["@type"], "product"),
  );
  if (!product) return null;

  return {
    name: asText(product.name),
    image: firstImage(product.image),
    price: offerPrice(product.offers),
    color: asText(product.color),
    category: asText(product.category),
    sku:
      asText(product.sku) ?? asText(product.productID) ?? asText(product.mpn),
    brand: brandName(product.brand),
    sizes: textValues(product.size),
    url: asText(product.url),
  };
}

function breadcrumbLabel(item: unknown): string | null {
  if (!isRecord(item)) return null;
  return (
    asText(item.name) ?? (isRecord(item.item) ? asText(item.item.name) : null)
  );
}

function specificCategory(labels: string[]): string | null {
  const candidates = labels
    .map((label) => label.replace(/\s+/g, " ").trim())
    .filter(
      (label) =>
        label !== "" &&
        !GENERIC_CATEGORIES.has(label.toLocaleLowerCase("pt-BR")),
    );
  return candidates.at(-1) ?? null;
}

export function extractJsonLdBreadcrumbCategory($: CheerioAPI): string | null {
  const breadcrumb = readJsonLdNodes($).find((node) =>
    typeMatches(node["@type"], "breadcrumblist"),
  );
  if (!breadcrumb || !Array.isArray(breadcrumb.itemListElement)) return null;

  const ordered = [...breadcrumb.itemListElement].sort((left, right) => {
    const leftPosition =
      isRecord(left) && typeof left.position === "number" ? left.position : 0;
    const rightPosition =
      isRecord(right) && typeof right.position === "number"
        ? right.position
        : 0;
    return leftPosition - rightPosition;
  });

  return specificCategory(
    ordered
      .map(breadcrumbLabel)
      .filter((label): label is string => label !== null),
  );
}

export function extractHtmlBreadcrumbCategory($: CheerioAPI): string | null {
  const selectors = [
    'nav[aria-label*="breadcrumb" i]',
    '[class*="breadcrumb" i]',
  ];

  for (const selector of selectors) {
    const container = $(selector).first();
    if (!container.length) continue;

    const labels: string[] = [];
    container.find("a, li, [itemprop='name']").each((_, element) => {
      const label = $(element).text().replace(/\s+/g, " ").trim();
      if (label && !labels.includes(label)) labels.push(label);
    });

    const category = specificCategory(labels);
    if (category) return category;
  }

  return null;
}

function metaContent($: CheerioAPI, keys: string[]): string | null {
  for (const key of keys) {
    const content =
      $(`meta[property="${key}"]`).attr("content") ??
      $(`meta[name="${key}"]`).attr("content");
    const text = asText(content);
    if (text) return text;
  }
  return null;
}

export type OpenGraphData = {
  name: string | null;
  image: string | null;
  price: string | null;
  url: string | null;
};

export function extractOpenGraph($: CheerioAPI): OpenGraphData {
  return {
    name: metaContent($, ["og:title", "twitter:title"]),
    image: metaContent($, ["og:image", "twitter:image"]),
    price: metaContent($, ["product:price:amount"]),
    url: metaContent($, ["og:url"]),
  };
}

export function extractBasicMetadata($: CheerioAPI): { name: string | null } {
  return { name: asText($("title").first().text()) };
}

function resolveUrl(value: string | null, pageUrl: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, pageUrl);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function skuFromUrl(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    const parameter =
      url.searchParams.get("sku") ??
      url.searchParams.get("productId") ??
      url.searchParams.get("product_id");
    if (parameter) return parameter;

    const match = url.pathname.match(/(?:produto|product|p)[/-]([a-z0-9_-]+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function extractProductMetadata(
  html: string,
  pageUrl: string,
): RawProductMetadata {
  const $ = cheerio.load(html);
  const jsonLd = extractJsonLdProduct($);
  const openGraph = extractOpenGraph($);
  const basic = extractBasicMetadata($);
  const jsonLdCategory = extractJsonLdBreadcrumbCategory($);
  const htmlCategory = jsonLdCategory ? null : extractHtmlBreadcrumbCategory($);
  const sources = new Set<ExtractionSource>();

  const pick = <T>(
    candidates: Array<[T | null, ExtractionSource]>,
  ): T | null => {
    for (const [value, source] of candidates) {
      if (value !== null) {
        sources.add(source);
        return value;
      }
    }
    return null;
  };

  const canonicalUrl = resolveUrl(
    asText($('link[rel="canonical"]').attr("href")) ??
      jsonLd?.url ??
      openGraph.url,
    pageUrl,
  );

  return {
    canonicalUrl,
    sku: jsonLd?.sku ?? skuFromUrl(canonicalUrl ?? pageUrl),
    name: pick([
      [jsonLd?.name ?? null, "json-ld"],
      [openGraph.name, "open-graph"],
      [basic.name, "meta"],
    ]),
    imageUrl: resolveUrl(
      pick([
        [jsonLd?.image ?? null, "json-ld"],
        [openGraph.image, "open-graph"],
      ]),
      pageUrl,
    ),
    price: pick([
      [jsonLd?.price ?? null, "json-ld"],
      [openGraph.price, "open-graph"],
    ]),
    color: pick([[jsonLd?.color ?? null, "json-ld"]]),
    category: pick([
      [jsonLdCategory, "breadcrumb"],
      [htmlCategory, "breadcrumb"],
      [jsonLd?.category ?? null, "json-ld"],
    ]),
    brand: pick([[jsonLd?.brand ?? null, "json-ld"]]),
    availableSizes: jsonLd?.sizes ?? [],
    sources,
  };
}
