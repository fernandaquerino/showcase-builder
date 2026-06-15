export const liveThemePresetIds = [
  "classic",
  "minimal",
  "fashion",
  "romantic",
  "night",
] as const;

export const liveThemeTextModes = ["light", "dark", "auto"] as const;
export const liveThemeButtonStyles = ["rounded", "soft", "square"] as const;
export const liveThemeCardStyles = ["shadow", "border", "flat"] as const;
export const liveThemeFontPresets = ["modern", "elegant", "classic"] as const;
export const liveThemeHeroStyles = ["image", "overlay", "clean"] as const;

export type LiveThemePresetId = (typeof liveThemePresetIds)[number];
export type LiveThemeTextMode = (typeof liveThemeTextModes)[number];
export type LiveThemeButtonStyle = (typeof liveThemeButtonStyles)[number];
export type LiveThemeCardStyle = (typeof liveThemeCardStyles)[number];
export type LiveThemeFontPreset = (typeof liveThemeFontPresets)[number];
export type LiveThemeHeroStyle = (typeof liveThemeHeroStyles)[number];

export type LiveThemeConfig = {
  preset: LiveThemePresetId;
  primaryColor: string;
  backgroundColor: string;
  textMode: LiveThemeTextMode;
  buttonStyle: LiveThemeButtonStyle;
  cardStyle: LiveThemeCardStyle;
  fontPreset: LiveThemeFontPreset;
  heroStyle: LiveThemeHeroStyle;
};

export type LiveThemePreset = LiveThemeConfig & {
  name: string;
  description: string;
};

export type LiveThemeCssVariables = Record<
  | "--live-background"
  | "--live-foreground"
  | "--live-primary"
  | "--live-primary-foreground"
  | "--live-card"
  | "--live-card-foreground"
  | "--live-border"
  | "--live-muted"
  | "--live-muted-foreground"
  | "--live-radius"
  | "--live-font-family",
  string
>;

export const LIVE_THEME_COLOR_SWATCHES = [
  { name: "Ameixa", value: "#7C2D5A" },
  { name: "Rosa", value: "#D9468F" },
  { name: "Terracota", value: "#B85C38" },
  { name: "Azul", value: "#2563EB" },
  { name: "Verde", value: "#2F7D5F" },
  { name: "Preto", value: "#171717" },
  { name: "Dourado", value: "#9A6B16" },
] as const;

export const LIVE_THEME_PRESETS: Record<LiveThemePresetId, LiveThemePreset> = {
  classic: {
    name: "Clássico",
    description: "Elegante, claro e fácil de ler.",
    preset: "classic",
    primaryColor: "#7C2D5A",
    backgroundColor: "#FAF7F2",
    textMode: "auto",
    buttonStyle: "soft",
    cardStyle: "border",
    fontPreset: "modern",
    heroStyle: "image",
  },
  minimal: {
    name: "Minimalista",
    description: "Limpo, branco e com pouco ruído visual.",
    preset: "minimal",
    primaryColor: "#171717",
    backgroundColor: "#FFFFFF",
    textMode: "auto",
    buttonStyle: "square",
    cardStyle: "flat",
    fontPreset: "modern",
    heroStyle: "clean",
  },
  fashion: {
    name: "Fashion",
    description: "Mais presença para campanhas e lançamentos.",
    preset: "fashion",
    primaryColor: "#BE185D",
    backgroundColor: "#FFF1F6",
    textMode: "auto",
    buttonStyle: "rounded",
    cardStyle: "shadow",
    fontPreset: "elegant",
    heroStyle: "overlay",
  },
  romantic: {
    name: "Romântico",
    description: "Tons suaves, delicado e acolhedor.",
    preset: "romantic",
    primaryColor: "#B83280",
    backgroundColor: "#FFF7F7",
    textMode: "auto",
    buttonStyle: "rounded",
    cardStyle: "border",
    fontPreset: "classic",
    heroStyle: "image",
  },
  night: {
    name: "Noturno",
    description: "Escuro, editorial e com alto contraste.",
    preset: "night",
    primaryColor: "#F5C542",
    backgroundColor: "#141014",
    textMode: "auto",
    buttonStyle: "soft",
    cardStyle: "shadow",
    fontPreset: "elegant",
    heroStyle: "overlay",
  },
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function stripLiveThemePresetMeta(
  preset: LiveThemePreset,
): LiveThemeConfig {
  return {
    preset: preset.preset,
    primaryColor: preset.primaryColor,
    backgroundColor: preset.backgroundColor,
    textMode: preset.textMode,
    buttonStyle: preset.buttonStyle,
    cardStyle: preset.cardStyle,
    fontPreset: preset.fontPreset,
    heroStyle: preset.heroStyle,
  };
}

function hexToRgb(color: string): { r: number; g: number; b: number } {
  const normalized = color.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function channelToLinear(value: number): number {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

export function getRelativeLuminance(color: string): number {
  const { r, g, b } = hexToRgb(color);
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

export function getContrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(
    getRelativeLuminance(foreground),
    getRelativeLuminance(background),
  );
  const darker = Math.min(
    getRelativeLuminance(foreground),
    getRelativeLuminance(background),
  );

  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableForeground(background: string): "#111111" | "#FFFFFF" {
  return getContrastRatio("#111111", background) >=
    getContrastRatio("#FFFFFF", background)
    ? "#111111"
    : "#FFFFFF";
}

export function getDefaultLiveTheme(): LiveThemeConfig {
  return stripLiveThemePresetMeta(LIVE_THEME_PRESETS.classic);
}

export function getLiveThemePreset(preset: LiveThemePresetId): LiveThemePreset {
  return LIVE_THEME_PRESETS[preset];
}

export function mergeLiveThemeWithPreset(
  theme: Partial<LiveThemeConfig> | null | undefined,
): LiveThemeConfig {
  const preset = theme?.preset ?? "classic";
  const presetTheme = stripLiveThemePresetMeta(getLiveThemePreset(preset));

  return {
    ...presetTheme,
    ...theme,
    preset,
  };
}

function shadeColor(color: string, amount: number): string {
  const { r, g, b } = hexToRgb(color);
  const next = [r, g, b].map((channel) =>
    Math.max(0, Math.min(255, Math.round(channel + amount))),
  );

  return `#${next
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function validateThemeContrast(theme: LiveThemeConfig): {
  valid: boolean;
  warnings: string[];
  recommended: LiveThemeConfig;
} {
  const foreground =
    theme.textMode === "light"
      ? "#FFFFFF"
      : theme.textMode === "dark"
        ? "#111111"
        : getReadableForeground(theme.backgroundColor);
  const primaryForeground = getReadableForeground(theme.primaryColor);
  const backgroundContrast = getContrastRatio(foreground, theme.backgroundColor);
  const primaryContrast = getContrastRatio(
    primaryForeground,
    theme.primaryColor,
  );
  const warnings: string[] = [];

  if (backgroundContrast < 4.5) {
    warnings.push("Esta cor de fundo pode deixar o texto difícil de ler.");
  }

  if (primaryContrast < 4.5) {
    warnings.push("Esta cor principal pode deixar botões e filtros ilegíveis.");
  }

  return {
    valid: backgroundContrast >= 4.5 && primaryContrast >= 4.5,
    warnings,
    recommended: { ...theme, textMode: "auto" },
  };
}

export function getLiveThemeCssVariables(
  themeInput: Partial<LiveThemeConfig> | null | undefined,
): LiveThemeCssVariables {
  const theme = mergeLiveThemeWithPreset(themeInput);
  const foreground =
    theme.textMode === "light"
      ? "#FFFFFF"
      : theme.textMode === "dark"
        ? "#111111"
        : getReadableForeground(theme.backgroundColor);
  const card =
    foreground === "#FFFFFF"
      ? shadeColor(theme.backgroundColor, 14)
      : shadeColor(theme.backgroundColor, 255 - 248);
  const muted =
    foreground === "#FFFFFF"
      ? shadeColor(theme.backgroundColor, 28)
      : shadeColor(theme.backgroundColor, -8);
  const border =
    foreground === "#FFFFFF"
      ? "rgba(255,255,255,0.18)"
      : "rgba(17,17,17,0.14)";
  const radius = {
    rounded: "1.5rem",
    soft: "0.875rem",
    square: "0.25rem",
  }[theme.buttonStyle];
  const font = {
    modern: "var(--font-sans)",
    elegant: 'Georgia, "Times New Roman", serif',
    classic: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  }[theme.fontPreset];

  return {
    "--live-background": theme.backgroundColor,
    "--live-foreground": foreground,
    "--live-primary": theme.primaryColor,
    "--live-primary-foreground": getReadableForeground(theme.primaryColor),
    "--live-card": card,
    "--live-card-foreground": foreground,
    "--live-border": border,
    "--live-muted": muted,
    "--live-muted-foreground":
      foreground === "#FFFFFF" ? "rgba(255,255,255,0.72)" : "rgba(17,17,17,0.62)",
    "--live-radius": radius,
    "--live-font-family": font,
  };
}
