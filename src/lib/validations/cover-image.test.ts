import { describe, expect, it } from "vitest";

import {
  COVER_IMAGE_MAX_BYTES,
  sniffCoverImageExtension,
  validateCoverImageFile,
} from "./cover-image";

describe("validateCoverImageFile", () => {
  it("accepts JPEG, PNG and WebP within the size limit", () => {
    expect(validateCoverImageFile({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validateCoverImageFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateCoverImageFile({ type: "image/webp", size: 1000 })).toBeNull();
  });

  it("rejects disallowed types (SVG, GIF, PDF)", () => {
    expect(validateCoverImageFile({ type: "image/svg+xml", size: 10 })).toBe(
      "invalidType",
    );
    expect(validateCoverImageFile({ type: "image/gif", size: 10 })).toBe(
      "invalidType",
    );
    expect(validateCoverImageFile({ type: "application/pdf", size: 10 })).toBe(
      "invalidType",
    );
  });

  it("rejects files over 5 MB", () => {
    expect(
      validateCoverImageFile({ type: "image/png", size: COVER_IMAGE_MAX_BYTES + 1 }),
    ).toBe("tooLarge");
  });
});

describe("sniffCoverImageExtension", () => {
  it("detects a JPEG from its magic bytes", () => {
    expect(sniffCoverImageExtension(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe(
      "jpg",
    );
  });

  it("detects a PNG from its magic bytes", () => {
    expect(
      sniffCoverImageExtension(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("png");
  });

  it("detects a WebP from its RIFF/WEBP header", () => {
    const bytes = new Uint8Array(12);
    bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    bytes.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
    expect(sniffCoverImageExtension(bytes)).toBe("webp");
  });

  it("rejects an SVG/text payload spoofing an image type", () => {
    const svg = new TextEncoder().encode("<svg xmlns=...>");
    expect(sniffCoverImageExtension(svg)).toBeNull();
  });
});
