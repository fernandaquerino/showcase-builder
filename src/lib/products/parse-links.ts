import { isSafeHttpUrl, normalizeUrlForComparison } from "@/lib/url";

/** Maximum number of links accepted in a single bulk import. */
export const MAX_IMPORT_LINKS = 20;

export type ParsedLinkStatus =
  | "valid"
  | "invalid"
  | "host-not-allowed"
  | "duplicate"
  | "already-added";

export type ParsedLink = {
  /** Position in the pasted list, used to keep the original order stable. */
  originalIndex: number;
  /** The affiliate URL exactly as pasted (trimmed). UTMs are preserved. */
  affiliateUrl: string;
  hostname: string | null;
  status: ParsedLinkStatus;
};

export type ParseProductLinksOptions = {
  /** Exact hostnames allowed for extraction (lowercased). */
  allowedHosts: readonly string[];
  /** Comparison keys of links already present in the live. */
  existingUrlKeys?: readonly string[];
};

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Splits a textarea of pasted links into classified entries. Pure and testable:
 * no network, no host secrets baked in (the allowlist is passed by the caller).
 * Order is preserved, empty lines are dropped, and the affiliate URL is kept
 * verbatim so its UTMs survive into the saved product.
 */
export function parseProductLinks(
  input: string,
  { allowedHosts, existingUrlKeys = [] }: ParseProductLinksOptions,
): ParsedLink[] {
  const allowed = new Set(allowedHosts.map((host) => host.toLowerCase()));
  const existing = new Set(existingUrlKeys);
  const seen = new Set<string>();

  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((affiliateUrl, originalIndex) => {
    const base = { originalIndex, affiliateUrl, hostname: hostnameOf(affiliateUrl) };

    if (!isSafeHttpUrl(affiliateUrl)) {
      return { ...base, status: "invalid" as const };
    }

    const key = normalizeUrlForComparison(affiliateUrl);
    if (!key) {
      return { ...base, status: "invalid" as const };
    }

    if (base.hostname === null || !allowed.has(base.hostname)) {
      return { ...base, status: "host-not-allowed" as const };
    }

    if (existing.has(key)) {
      return { ...base, status: "already-added" as const };
    }

    if (seen.has(key)) {
      return { ...base, status: "duplicate" as const };
    }
    seen.add(key);

    return { ...base, status: "valid" as const };
  });
}

export const PARSED_LINK_LABELS: Record<ParsedLinkStatus, string> = {
  valid: "Válido",
  invalid: "Link inválido",
  "host-not-allowed": "Host não aceito",
  duplicate: "Duplicado",
  "already-added": "Já está na live",
};
