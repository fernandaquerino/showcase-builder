import { describe, expect, it } from "vitest";

import {
  MAX_IMPORT_LINKS,
  parseProductLinks,
  type ParsedLink,
} from "./parse-links";

const allowedHosts = ["www.cea.com.br", "minhacea.cea.com.br"];

function statuses(links: ParsedLink[]): string[] {
  return links.map((link) => link.status);
}

describe("parseProductLinks", () => {
  it("parses multiple links, one per line, preserving order", () => {
    const result = parseProductLinks(
      "https://www.cea.com.br/a/p\nhttps://www.cea.com.br/b/p",
      { allowedHosts },
    );
    expect(result).toHaveLength(2);
    expect(result[0].originalIndex).toBe(0);
    expect(result[1].affiliateUrl).toBe("https://www.cea.com.br/b/p");
    expect(statuses(result)).toEqual(["valid", "valid"]);
  });

  it("trims whitespace and ignores empty lines", () => {
    const result = parseProductLinks(
      "  https://www.cea.com.br/a/p  \n\n   \nhttps://www.cea.com.br/b/p",
      { allowedHosts },
    );
    expect(result).toHaveLength(2);
    expect(result[0].affiliateUrl).toBe("https://www.cea.com.br/a/p");
  });

  it("preserves affiliate UTMs verbatim", () => {
    const url =
      "https://www.cea.com.br/a/p?utm_source=mais&utm_campaign=pambraga";
    const [link] = parseProductLinks(url, { allowedHosts });
    expect(link.affiliateUrl).toBe(url);
    expect(link.status).toBe("valid");
  });

  it("flags invalid protocols and malformed URLs", () => {
    const result = parseProductLinks(
      "javascript:alert(1)\nnot a url\nftp://x.com/a",
      { allowedHosts },
    );
    expect(statuses(result)).toEqual(["invalid", "invalid", "invalid"]);
  });

  it("flags hosts outside the allowlist", () => {
    const [link] = parseProductLinks("https://evil.example.com/p", {
      allowedHosts,
    });
    expect(link.status).toBe("host-not-allowed");
  });

  it("flags exact duplicates after the first occurrence", () => {
    const result = parseProductLinks(
      "https://www.cea.com.br/a/p\nhttps://www.cea.com.br/a/p/",
      { allowedHosts },
    );
    expect(statuses(result)).toEqual(["valid", "duplicate"]);
  });

  it("does not treat different UTMs of the same path as separate products", () => {
    const result = parseProductLinks(
      "https://www.cea.com.br/a/p?utm=1\nhttps://www.cea.com.br/a/p?utm=2",
      { allowedHosts },
    );
    // Different query strings are different links (UTMs preserved), so both valid.
    expect(statuses(result)).toEqual(["valid", "valid"]);
  });

  it("flags links already present in the live", () => {
    const result = parseProductLinks("https://www.cea.com.br/a/p", {
      allowedHosts,
      existingUrlKeys: ["https://www.cea.com.br/a/p"],
    });
    expect(result[0].status).toBe("already-added");
  });

  it("exposes a sane default limit", () => {
    expect(MAX_IMPORT_LINKS).toBe(20);
  });
});
