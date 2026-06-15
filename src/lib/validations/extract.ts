import { z } from "zod";

/** Fields the extractor is allowed to suggest. */
export const EXTRACTABLE_FIELDS = [
  "name",
  "imageUrl",
  "price",
  "color",
  "category",
  "brand",
  "sku",
  "availableSizes",
] as const;

export type ExtractableField = (typeof EXTRACTABLE_FIELDS)[number];

export type ExtractionSource =
  | "json-ld"
  | "open-graph"
  | "breadcrumb"
  | "meta"
  | "mixed";

export type ExtractionErrorCode =
  | "INVALID_URL"
  | "HOST_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "TOO_MANY_REDIRECTS"
  | "UNSUPPORTED_CONTENT"
  | "RESPONSE_TOO_LARGE"
  | "UPSTREAM_BLOCKED"
  | "NOT_FOUND"
  | "NO_PRODUCT_DATA"
  | "EXTRACTION_FAILED";

export type ExtractionSuccessData = {
  affiliateUrl: string;
  canonicalUrl: string | null;
  sourceUrl: string;
  finalUrl: string;
  sku: string | null;
  name: string | null;
  imageUrl: string | null;
  price: string | null;
  color: string | null;
  category: string | null;
  brand: string | null;
  availableSizes: string[];
  fieldsFound: ExtractableField[];
  extractionSource: ExtractionSource;
  completeness: "complete" | "partial";
  fromCache: boolean;
};

export type ExtractionResponse =
  | { success: true; data: ExtractionSuccessData }
  | { success: false; error: { code: ExtractionErrorCode; message: string } };

/** Request body. URL safety (protocol, host, SSRF) is enforced by the guard. */
export const extractRequestSchema = z.object({
  url: z
    .string()
    .min(1, "Informe um link.")
    .max(2048, "Link muito longo.")
    .refine((value) => value.trim() !== "", "Informe um link."),
});

export type ExtractRequest = z.infer<typeof extractRequestSchema>;
