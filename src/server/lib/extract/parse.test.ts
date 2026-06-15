// @vitest-environment node
import { load } from "cheerio";
import { describe, expect, it } from "vitest";

import {
  extractHtmlBreadcrumbCategory,
  extractJsonLdBreadcrumbCategory,
  extractJsonLdProduct,
  extractOpenGraph,
  extractProductMetadata,
} from "./parse";

function jsonLd(payload: unknown): string {
  return `<html><head><script type="application/ld+json">${JSON.stringify(
    payload,
  )}</script></head><body></body></html>`;
}

const PAGE = "https://loja.exemplo.com/produto/123";

describe("extractJsonLdProduct", () => {
  it("reads the extended Product fields", () => {
    const product = extractJsonLdProduct(
      load(
        jsonLd({
          "@type": "Product",
          name: "Jaqueta",
          image: ["https://cdn.exemplo.com/a.jpg"],
          color: "Preto",
          category: "Casacos",
          sku: "SKU-123",
          brand: { "@type": "Brand", name: "Mindset" },
          size: ["P", "M", "G"],
          url: "/produto/123",
          offers: [{ price: "199.90" }],
        }),
      ),
    );

    expect(product).toEqual({
      name: "Jaqueta",
      image: "https://cdn.exemplo.com/a.jpg",
      price: "199.90",
      color: "Preto",
      category: "Casacos",
      sku: "SKU-123",
      brand: "Mindset",
      sizes: ["P", "M", "G"],
      url: "/produto/123",
    });
  });

  it("supports array, @graph, type array, image object and brand string", () => {
    const product = extractJsonLdProduct(
      load(
        jsonLd([
          { "@type": "WebSite", name: "Loja" },
          {
            "@graph": [
              {
                "@type": ["Thing", "Product"],
                name: "Bota",
                image: { contentUrl: "https://a/bota.jpg" },
                productID: "P-9",
                brand: "Marca",
                size: "36, 37|38",
                offers: { lowPrice: 99.9 },
              },
            ],
          },
        ]),
      ),
    );

    expect(product?.sku).toBe("P-9");
    expect(product?.brand).toBe("Marca");
    expect(product?.sizes).toEqual(["36", "37", "38"]);
    expect(product?.image).toBe("https://a/bota.jpg");
    expect(product?.price).toBe(99.9);
  });

  it("uses mpn after sku and productID", () => {
    const product = extractJsonLdProduct(
      load(jsonLd({ "@type": "Product", name: "X", mpn: "MPN-1" })),
    );
    expect(product?.sku).toBe("MPN-1");
  });

  it("ignores malformed JSON-LD and returns null without a Product", () => {
    const html =
      '<script type="application/ld+json">{bad}</script>' +
      '<script type="application/ld+json">{"@type":"WebSite"}</script>';
    expect(extractJsonLdProduct(load(html))).toBeNull();
  });
});

describe("breadcrumbs", () => {
  it("chooses the most specific JSON-LD breadcrumb and ignores generic levels", () => {
    const $ = load(
      jsonLd({
        "@type": "BreadcrumbList",
        itemListElement: [
          { position: 1, name: "Home" },
          { position: 2, item: { name: "Feminino" } },
          { position: 3, name: "Roupas" },
          { position: 4, name: "Jaquetas" },
        ],
      }),
    );
    expect(extractJsonLdBreadcrumbCategory($)).toBe("Jaquetas");
  });

  it("uses semantic HTML breadcrumbs as fallback", () => {
    const $ = load(
      '<nav aria-label="Breadcrumb"><a>Início</a><a>Roupas</a><a>Vestidos</a></nav>',
    );
    expect(extractHtmlBreadcrumbCategory($)).toBe("Vestidos");
  });
});

describe("extractOpenGraph", () => {
  it("reads title, image, price and canonical candidate", () => {
    const $ = load(`<head>
      <meta property="og:title" content="Vestido" />
      <meta property="og:image" content="https://a/og.jpg" />
      <meta property="product:price:amount" content="259.90" />
      <meta property="og:url" content="https://loja.exemplo.com/p/vestido" />
    </head>`);
    expect(extractOpenGraph($)).toEqual({
      name: "Vestido",
      image: "https://a/og.jpg",
      price: "259.90",
      url: "https://loja.exemplo.com/p/vestido",
    });
  });
});

describe("extractProductMetadata", () => {
  it("prefers JSON-LD fields and BreadcrumbList category", () => {
    const html = jsonLd([
      {
        "@type": "Product",
        name: "Jaqueta",
        category: "Categoria estruturada",
        sku: "ABC",
        brand: "Mindset",
        image: "/image.jpg",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [{ position: 1, name: "Jaquetas" }],
      },
    ]).replace(
      "</head>",
      '<link rel="canonical" href="/produto/123?utm_source=x" /></head>',
    );

    const result = extractProductMetadata(html, PAGE);
    expect(result.category).toBe("Jaquetas");
    expect(result.canonicalUrl).toBe(
      "https://loja.exemplo.com/produto/123?utm_source=x",
    );
    expect(result.sku).toBe("ABC");
    expect(result.brand).toBe("Mindset");
    expect(result.imageUrl).toBe("https://loja.exemplo.com/image.jpg");
    expect([...result.sources].sort()).toEqual(["breadcrumb", "json-ld"]);
  });

  it("combines JSON-LD with Open Graph and marks both sources", () => {
    const html = jsonLd({ "@type": "Product", name: "Casaco" }).replace(
      "</head>",
      '<meta property="og:image" content="https://a/og.jpg" /></head>',
    );
    const result = extractProductMetadata(html, PAGE);
    expect(result.name).toBe("Casaco");
    expect(result.imageUrl).toBe("https://a/og.jpg");
    expect([...result.sources].sort()).toEqual(["json-ld", "open-graph"]);
  });

  it("falls back to title and extracts a product code from the URL", () => {
    const result = extractProductMetadata(
      "<html><head><title>Produto legal</title></head></html>",
      PAGE,
    );
    expect(result.name).toBe("Produto legal");
    expect(result.sku).toBe("123");
    expect(result.sources.has("meta")).toBe(true);
  });
});
