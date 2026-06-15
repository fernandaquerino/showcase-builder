/**
 * Result of parsing a Brazilian-formatted price string typed by the creator.
 * `empty` means the field was left blank (persist `null`); `invalid` means the
 * input could not be understood; `valid` carries a canonical decimal string
 * (e.g. `"199.90"`) safe to store in a `numeric` column.
 */
export type PriceParseResult =
  | { kind: "empty" }
  | { kind: "valid"; value: string }
  | { kind: "invalid" };

/**
 * Parses a friendly BRL amount into a canonical decimal string, never a float.
 *
 * Accepts `"99,90"`, `"1.299,90"`, `"129"`, `"0,99"` and an optional `R$`
 * prefix. `.` is the thousands separator and `,` the decimal separator.
 * Rejects negatives, letters and malformed input like `"12,3,4"`.
 */
export function parseBrlPrice(raw: string): PriceParseResult {
  const cleaned = raw.trim().replace(/^R\$/i, "").replace(/\s/g, "");

  if (cleaned === "") {
    return { kind: "empty" };
  }

  // Only digits, dots and commas are allowed (so "-10" and "abc" are rejected).
  if (!/^[0-9.,]+$/.test(cleaned)) {
    return { kind: "invalid" };
  }

  const commaCount = (cleaned.match(/,/g) ?? []).length;
  if (commaCount > 1) {
    return { kind: "invalid" };
  }

  let integerPart = cleaned;
  let decimalPart = "";

  if (commaCount === 1) {
    [integerPart, decimalPart] = cleaned.split(",");
    if (decimalPart.length < 1 || decimalPart.length > 2) {
      return { kind: "invalid" };
    }
  }

  const integerDigits = integerPart.replace(/\./g, "");
  if (!/^\d+$/.test(integerDigits)) {
    return { kind: "invalid" };
  }

  const decimals = `${decimalPart}00`.slice(0, 2);
  const value = `${integerDigits}.${decimals}`;
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return { kind: "invalid" };
  }

  return { kind: "valid", value };
}

/**
 * Formats a canonical decimal string (e.g. `"199.90"`) for display as
 * `"R$ 199,90"`, grouping thousands with dots. Returns `null` for `null` input.
 */
export function formatBrlPrice(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const [integerPart, decimalPart = "00"] = value.split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = `${decimalPart}00`.slice(0, 2);

  return `R$ ${grouped},${decimals}`;
}
