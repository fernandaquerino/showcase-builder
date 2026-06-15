import "server-only";

import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

import type { ExtractionSource } from "@/lib/validations/extract";
import type { RawProductMetadata } from "./normalize";

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
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function typeMatches(typeField: unknown, target: string): boolean {
  if (typeof typeField === "string") {
    return typeField.toLowerCase() === target;
  }
  if (Array.isArray(typeField)) {
    return typeField.some(
      (type) => typeof type === "string" && type.toLowerCase() === target,
    );
  }
  return false;
}

/** Flattens a parsed JSON-LD blob into candidate nodes (handles arrays, `@graph`). */
function flattenJsonLd(parsed: unknown): unknown[] {
  const nodes: unknown[] = [];

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

function firstImage(value: unknown): string | null {
  if (typeof value === "string") {
    return asText(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstImage(item);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (isRecord(value)) {
    return asText(value.url);
  }
  return null;
}

function pickPrice(node: Record<string, unknown>): string | number | null {
  const direct = asPrice(node.price) ?? asPrice(node.lowPrice);
  if (direct !== null) {
    return direct;
  }
  if (isRecord(node.priceSpecification)) {
    return asPrice(node.priceSpecification.price);
  }
  return null;
}

function offerPrice(offers: unknown): string | number | null {
  if (Array.isArray(offers)) {
    for (const offer of offers) {
      if (isRecord(offer)) {
        const price = pickPrice(offer);
        if (price !== null) {
          return price;
        }
      }
    }
    return null;
  }
  if (isRecord(offers)) {
    return pickPrice(offers);
  }
  return null;
}

type JsonLdProduct = {
  name: string | null;
  image: string | null;
  price: string | number | null;
  color: string | null;
};

/** First strategy: schema.org Product via JSON-LD. Invalid blocks are skipped. */
export function extractJsonLdProduct($: CheerioAPI): JsonLdProduct | null {
  const nodes: unknown[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text();
    if (!raw.trim()) {
      return;
    }
    try {
      nodes.push(...flattenJsonLd(JSON.parse(raw)));
    } catch {
      // Ignore malformed JSON-LD blocks; other scripts may still be valid.
    }
  });

  const product = nodes.find(
    (node) => isRecord(node) && typeMatches(node["@type"], "product"),
  );
  if (!isRecord(product)) {
    return null;
  }

  return {
    name: asText(product.name),
    image: firstImage(product.image),
    price: offerPrice(product.offers),
    color: asText(product.color),
  };
}

function metaContent($: CheerioAPI, keys: string[]): string | null {
  for (const key of keys) {
    const content =
      $(`meta[property="${key}"]`).attr("content") ??
      $(`meta[name="${key}"]`).attr("content");
    const text = asText(content);
    if (text) {
      return text;
    }
  }
  return null;
}

type OpenGraphData = {
  name: string | null;
  image: string | null;
  price: string | null;
};

/** Fallback strategy: Open Graph / Twitter card meta tags. */
export function extractOpenGraph($: CheerioAPI): OpenGraphData {
  return {
    name: metaContent($, ["og:title", "twitter:title"]),
    image: metaContent($, ["og:image", "twitter:image"]),
    price: metaContent($, ["product:price:amount"]),
  };
}

/** Last fallback: the page `<title>`. Images are intentionally not guessed. */
export function extractBasicMetadata($: CheerioAPI): { name: string | null } {
  return { name: asText($("title").first().text()) };
}

function resolveUrl(value: string | null, pageUrl: string): string | null {
  if (!value) {
    return null;
  }
  try {
    return new URL(value, pageUrl).href;
  } catch {
    return null;
  }
}

/**
 * Merges all strategies into raw metadata, preferring JSON-LD, then Open Graph,
 * then basic meta — never replacing a higher-priority value with a lesser one.
 * Records which strategies contributed so the caller can flag `mixed` sources.
 */
export function extractProductMetadata(
  html: string,
  pageUrl: string,
): RawProductMetadata {
  const $ = cheerio.load(html);

  const jsonLd = extractJsonLdProduct($);
  const openGraph = extractOpenGraph($);
  const basic = extractBasicMetadata($);

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

  const name = pick<string>([
    [jsonLd?.name ?? null, "json-ld"],
    [openGraph.name, "open-graph"],
    [basic.name, "meta"],
  ]);
  const rawImage = pick<string>([
    [jsonLd?.image ?? null, "json-ld"],
    [openGraph.image, "open-graph"],
  ]);
  const price = pick<string | number>([
    [jsonLd?.price ?? null, "json-ld"],
    [openGraph.price, "open-graph"],
  ]);
  const color = pick<string>([[jsonLd?.color ?? null, "json-ld"]]);

  return {
    name,
    imageUrl: resolveUrl(rawImage, pageUrl),
    price,
    color,
    sources,
  };
}
