import "server-only";

import { z } from "zod";

const optionalCredential = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.url("DATABASE_URL must be a valid URL."),
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must have at least 32 characters."),
    AUTH_GOOGLE_ID: optionalCredential,
    AUTH_GOOGLE_SECRET: optionalCredential,
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
