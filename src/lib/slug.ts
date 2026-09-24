const SLUG_MAX_LENGTH = 80;
const SLUG_FALLBACK = "live";

/**
 * Builds a URL-safe slug from arbitrary text.
 *
 * Lowercases, replaces separators with hyphens, removes invalid characters,
 * collapses duplicate hyphens and trims leading/trailing hyphens. Falls back to
 * a safe base when the result would be empty.
 */
export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");

  return slug || SLUG_FALLBACK;
}

/**
 * Appends a numeric suffix to a base slug, keeping it within the length limit.
 * `appendSuffix("minha-live", 2)` -> `"minha-live-2"`.
 */
export function appendSuffix(base: string, suffix: number): string {
  const suffixText = `-${suffix}`;
  return `${base.slice(0, SLUG_MAX_LENGTH - suffixText.length).replace(/-+$/g, "")}${suffixText}`;
}
