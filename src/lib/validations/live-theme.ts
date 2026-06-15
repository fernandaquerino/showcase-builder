import { z } from "zod";

import {
  getDefaultLiveTheme,
  isHexColor,
  liveThemeButtonStyles,
  liveThemeCardStyles,
  liveThemeFontPresets,
  liveThemeHeroStyles,
  liveThemePresetIds,
  liveThemeTextModes,
  mergeLiveThemeWithPreset,
  validateThemeContrast,
  type LiveThemeConfig,
} from "@/lib/live-theme";

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use uma cor hexadecimal no formato #RRGGBB.")
  .transform((value) => value.toUpperCase());

export const liveThemeConfigSchema = z
  .object({
    preset: z.enum(liveThemePresetIds),
    primaryColor: hexColorSchema,
    backgroundColor: hexColorSchema,
    textMode: z.enum(liveThemeTextModes),
    buttonStyle: z.enum(liveThemeButtonStyles),
    cardStyle: z.enum(liveThemeCardStyles),
    fontPreset: z.enum(liveThemeFontPresets),
    heroStyle: z.enum(liveThemeHeroStyles),
  })
  .strict()
  .superRefine((theme, context) => {
    if (!isHexColor(theme.primaryColor) || !isHexColor(theme.backgroundColor)) {
      return;
    }

    const contrast = validateThemeContrast(theme);
    if (!contrast.valid) {
      context.addIssue({
        code: "custom",
        path: ["backgroundColor"],
        message:
          "Esta combinação pode ficar difícil de ler. Use a combinação recomendada.",
      });
    }
  });

export const liveThemeConfigInputSchema = liveThemeConfigSchema.catch(
  getDefaultLiveTheme(),
);

export function parseLiveThemeConfig(value: unknown): LiveThemeConfig {
  if (!value || typeof value !== "object") {
    return getDefaultLiveTheme();
  }

  const parsed = liveThemeConfigInputSchema.parse(value);
  return mergeLiveThemeWithPreset(parsed);
}

export type LiveThemeConfigInput = z.input<typeof liveThemeConfigSchema>;
