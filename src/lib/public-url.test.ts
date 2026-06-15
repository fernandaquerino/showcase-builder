import { describe, expect, it } from "vitest";

import { buildPublicUrl, getPublicOrigin } from "./public-url";

describe("public URL helpers", () => {
  it("prefers the configured Auth URL", () => {
    expect(
      buildPublicUrl("/fernanda/teste", {
        AUTH_URL: "https://showcase.example.com/",
        VERCEL_URL: "preview.vercel.app",
      }),
    ).toBe("https://showcase.example.com/fernanda/teste");
  });

  it("uses Vercel URLs with https when no Auth URL is configured", () => {
    expect(
      getPublicOrigin({
        VERCEL_PROJECT_PRODUCTION_URL: "showcase-builder.vercel.app",
      }),
    ).toBe("https://showcase-builder.vercel.app");
  });

  it("falls back to localhost only outside configured deployments", () => {
    expect(buildPublicUrl("/fernanda/teste", {})).toBe(
      "http://localhost:3000/fernanda/teste",
    );
  });
});
