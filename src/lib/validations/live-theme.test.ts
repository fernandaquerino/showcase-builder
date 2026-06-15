import { describe, expect, it } from "vitest";

import { getDefaultLiveTheme } from "@/lib/live-theme";
import {
  liveThemeConfigInputSchema,
  liveThemeConfigSchema,
  parseLiveThemeConfig,
} from "./live-theme";

const validTheme = {
  preset: "fashion",
  primaryColor: "#BE185D",
  backgroundColor: "#FFF1F6",
  textMode: "auto",
  buttonStyle: "rounded",
  cardStyle: "shadow",
  fontPreset: "elegant",
  heroStyle: "overlay",
} as const;

describe("live theme validation", () => {
  it("accepts a valid theme", () => {
    expect(liveThemeConfigSchema.parse(validTheme)).toEqual(validTheme);
  });

  it("rejects invalid presets and colors", () => {
    const result = liveThemeConfigSchema.safeParse({
      ...validTheme,
      preset: "invalid",
      primaryColor: "rgb(0,0,0)",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = liveThemeConfigSchema.safeParse({
      ...validTheme,
      css: "body { display: none }",
    });

    expect(result.success).toBe(false);
  });

  it("falls back to the default for invalid persisted values", () => {
    expect(liveThemeConfigInputSchema.parse({ nope: true })).toEqual(
      getDefaultLiveTheme(),
    );
  });

  it("parses empty persisted values as default", () => {
    expect(parseLiveThemeConfig(null)).toEqual(getDefaultLiveTheme());
  });

  it("rejects unreadable explicit text mode", () => {
    const result = liveThemeConfigSchema.safeParse({
      ...validTheme,
      backgroundColor: "#FFFFFF",
      textMode: "light",
    });

    expect(result.success).toBe(false);
  });
});
