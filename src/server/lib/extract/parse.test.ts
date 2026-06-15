// @vitest-environment node
import { load } from "cheerio";
import { describe, expect, it } from "vitest";

import {
  extractJsonLdProduct,
  extractOpenGraph,
  extractProductMetadata,
} from "./parse";

function jsonLd(payload: unknown): string {
  return `<html><head><script type="application/ld+json">${JSON.stringify(
    payload,
  )}</script></head><body></body></html>`;
}

const PAGE = "https://loja.exemplo.com/p/1";

describe("extractJsonLdProduct", () => {
  it("reads a simple Product", () => {
    const $ = load(
      jsonLd({
        "@type": "Product",
        name: "Jaqueta",
        image: "https://cdn.exemplo.com/a.jpg",
        color: "Azul",
        offers: { "@type": "Offer", price: "199.90" },
      }),
    );

    expect(extractJsonLdProduct($)).toEqual({
      name: "Jaqueta",
      image: "https://cdn.exemplo.com/a.jpg",
      price: "199.90",
      color: "Azul",
    });
  });

  it("finds the Product inside an array", () => {
    const $ = load(
      jsonLd([
        { "@type": "WebSite", name: "Loja" },
        { "@type": "Product", name: "Calça", offers: { price: 99.9 } },
      ]),
    );
    expect(extractJsonLdProduct($)?.name).toBe("Calça");
    expect(extractJsonLdProduct($)?.price).toBe(99.9);
  });

  it("finds the Product inside @graph", () => {
    const $ = load(
      jsonLd({ "@graph": [{ "@type": ["Thing", "Product"], name: "Bota" }] }),
    );
    expect(extractJsonLdProduct($)?.name).toBe("Bota");
  });

  it("ignores an invalid block and uses a later valid one", () => {
    const html =
      `<html><head>` +
      `<script type="application/ld+json">{ not json }</script>` +
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Blusa",
      })}</script>` +
      `</head><body></body></html>`;
    expect(extractJsonLdProduct(load(html))?.name).toBe("Blusa");
  });

  it("reads image as an array or an object", () => {
    const asArray = load(
      jsonLd({ "@type": "Product", name: "X", image: ["https://a/x.jpg"] }),
    );
    expect(extractJsonLdProduct(asArray)?.image).toBe("https://a/x.jpg");

    const asObject = load(
      jsonLd({ "@type": "Product", name: "X", image: { url: "https://a/y.jpg" } }),
    );
    expect(extractJsonLdProduct(asObject)?.image).toBe("https://a/y.jpg");
  });

  it("reads price from offers array and lowPrice", () => {
    const arrayOffers = load(
      jsonLd({
        "@type": "Product",
        name: "X",
        offers: [{ price: "10.00" }, { price: "20.00" }],
      }),
    );
    expect(extractJsonLdProduct(arrayOffers)?.price).toBe("10.00");

    const aggregate = load(
      jsonLd({
        "@type": "Product",
        name: "X",
        offers: { "@type": "AggregateOffer", lowPrice: "49.90" },
      }),
    );
    expect(extractJsonLdProduct(aggregate)?.price).toBe("49.90");
  });

  it("returns null when there is no Product", () => {
    expect(extractJsonLdProduct(load("<html></html>"))).toBeNull();
  });
});

describe("extractOpenGraph", () => {
  it("reads Open Graph and Twitter fallbacks", () => {
    const $ = load(
      `<html><head>
        <meta property="og:title" content="Vestido" />
        <meta property="og:image" content="https://a/og.jpg" />
        <meta property="product:price:amount" content="259.90" />
      </head></html>`,
    );
    expect(extractOpenGraph($)).toEqual({
      name: "Vestido",
      image: "https://a/og.jpg",
      price: "259.90",
    });

    const twitter = load(
      `<html><head>
        <meta name="twitter:title" content="Saia" />
        <meta name="twitter:image" content="https://a/tw.jpg" />
      </head></html>`,
    );
    expect(extractOpenGraph(twitter).name).toBe("Saia");
    expect(extractOpenGraph(twitter).image).toBe("https://a/tw.jpg");
  });
});

describe("extractProductMetadata", () => {
  it("prefers JSON-LD over Open Graph", () => {
    const html =
      jsonLd({ "@type": "Product", name: "JSON Name" }).replace(
        "</head>",
        `<meta property="og:title" content="OG Name" /></head>`,
      );
    const result = extractProductMetadata(html, PAGE);
    expect(result.name).toBe("JSON Name");
    expect(result.sources.has("json-ld")).toBe(true);
  });

  it("marks the source as mixed when combining strategies", () => {
    const html =
      `<html><head>` +
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Casaco",
      })}</script>` +
      `<meta property="og:image" content="https://a/og.jpg" />` +
      `</head></html>`;
    const result = extractProductMetadata(html, PAGE);
    expect(result.name).toBe("Casaco");
    expect(result.imageUrl).toBe("https://a/og.jpg");
    expect([...result.sources].sort()).toEqual(["json-ld", "open-graph"]);
  });

  it("resolves a relative image against the page URL", () => {
    const html = jsonLd({
      "@type": "Product",
      name: "X",
      image: "/img/p.jpg",
    });
    expect(extractProductMetadata(html, PAGE).imageUrl).toBe(
      "https://loja.exemplo.com/img/p.jpg",
    );
  });

  it("returns no name/image when the page has no data", () => {
    const result = extractProductMetadata("<html><body>oi</body></html>", PAGE);
    expect(result.name).toBeNull();
    expect(result.imageUrl).toBeNull();
  });

  it("falls back to the page title for the name", () => {
    const result = extractProductMetadata(
      "<html><head><title>Produto Legal</title></head></html>",
      PAGE,
    );
    expect(result.name).toBe("Produto Legal");
    expect(result.sources.has("meta")).toBe(true);
  });
});
