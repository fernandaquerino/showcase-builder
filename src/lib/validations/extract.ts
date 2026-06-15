import { z } from "zod";

/** Fields the extractor is allowed to suggest. */
export const EXTRACTABLE_FIELDS = [
  "name",
  "imageUrl",
  "price",
  "color",
] as const;

export type ExtractableField = (typeof EXTRACTABLE_FIELDS)[number];

export type ExtractionSource = "json-ld" | "open-graph" | "meta" | "mixed";

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
  sourceUrl: string;
  finalUrl: string;
  name: string | null;
  imageUrl: string | null;
  price: string | null;
  color: string | null;
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
  url: z.string().trim().min(1, "Informe um link.").max(2048, "Link muito longo."),
});

export type ExtractRequest = z.infer<typeof extractRequestSchema>;
