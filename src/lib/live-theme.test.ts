import { describe, expect, it } from "vitest";

import {
  getContrastRatio,
  getDefaultLiveTheme,
  getLiveThemeCssVariables,
  getReadableForeground,
  LIVE_THEME_PRESETS,
  liveThemePresetIds,
  mergeLiveThemeWithPreset,
  validateThemeContrast,
} from "./live-theme";

describe("live theme helpers", () => {
  it("defines every preset with readable colors", () => {
    for (const presetId of liveThemePresetIds) {
      const preset = LIVE_THEME_PRESETS[presetId];
      const contrast = validateThemeContrast(preset);

      expect(contrast.valid).toBe(true);
    }
  });

  it("merges missing values with the selected preset", () => {
    expect(
      mergeLiveThemeWithPreset({
        preset: "night",
        primaryColor: "#FFFFFF",
      }).backgroundColor,
    ).toBe(LIVE_THEME_PRESETS.night.backgroundColor);
  });

  it("returns the default classic theme", () => {
    expect(getDefaultLiveTheme().preset).toBe("classic");
  });

  it("recommends readable foregrounds for light and dark backgrounds", () => {
    expect(getReadableForeground("#FFFFFF")).toBe("#111111");
    expect(getReadableForeground("#111111")).toBe("#FFFFFF");
    expect(getContrastRatio("#111111", "#FFFFFF")).toBeGreaterThan(4.5);
  });

  it("builds scoped CSS variables", () => {
    const variables = getLiveThemeCssVariables({
      ...getDefaultLiveTheme(),
      primaryColor: "#2563EB",
    });

    expect(variables["--live-primary"]).toBe("#2563EB");
    expect(variables["--live-background"]).toBeDefined();
    expect(variables["--live-primary-foreground"]).toBeDefined();
  });

  it("rejects critically low contrast combinations", () => {
    const result = validateThemeContrast({
      ...getDefaultLiveTheme(),
      backgroundColor: "#FFFFFF",
      textMode: "light",
    });

    expect(result.valid).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
