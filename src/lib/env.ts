import "server-only";

import { z } from "zod";

const optionalCredential = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

/** Numeric env var that treats empty/undefined as "use the default". */
const numericEnv = (fallback: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.coerce.number().int().positive().default(fallback),
  );

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.url("DATABASE_URL must be a valid URL."),
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must have at least 32 characters."),
    AUTH_GOOGLE_ID: optionalCredential,
    AUTH_GOOGLE_SECRET: optionalCredential,
    // Product extraction (Phase 3). The allowlist defaults to empty, which
    // keeps extraction disabled (never opens the whole internet) until real,
    // verified hosts are configured. None of these are NEXT_PUBLIC.
    PRODUCT_EXTRACTION_ALLOWED_HOSTS: z.string().default(""),
    PRODUCT_EXTRACTION_TIMEOUT_MS: numericEnv(8000),
    PRODUCT_EXTRACTION_MAX_REDIRECTS: numericEnv(5),
    PRODUCT_EXTRACTION_MAX_BYTES: numericEnv(1_048_576),
  })
  .superRefine((env, context) => {
    const hasGoogleId = Boolean(env.AUTH_GOOGLE_ID);
    const hasGoogleSecret = Boolean(env.AUTH_GOOGLE_SECRET);

    if (hasGoogleId !== hasGoogleSecret) {
      context.addIssue({
        code: "custom",
        message:
          "AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET must be configured together.",
        path: ["AUTH_GOOGLE_ID"],
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment: ${details}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function isGoogleAuthEnabled(): boolean {
  const env = getServerEnv();
  return Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
}

export type ExtractionConfig = {
  allowedHosts: Set<string>;
  timeoutMs: number;
  maxRedirects: number;
  maxBytes: number;
};

/**
 * Resolves the product-extraction configuration. Hostnames are normalized to
 * lowercase and compared exactly by the URL guard (no `includes`, no implicit
 * subdomains). An empty allowlist means extraction is effectively disabled.
 */
export function getExtractionConfig(): ExtractionConfig {
  const env = getServerEnv();

  const allowedHosts = new Set(
    env.PRODUCT_EXTRACTION_ALLOWED_HOSTS.split(",")
      .map((host) => host.trim().toLowerCase())
      .filter((host) => host.length > 0),
  );

  return {
    allowedHosts,
    timeoutMs: env.PRODUCT_EXTRACTION_TIMEOUT_MS,
    maxRedirects: env.PRODUCT_EXTRACTION_MAX_REDIRECTS,
    maxBytes: env.PRODUCT_EXTRACTION_MAX_BYTES,
  };
}
