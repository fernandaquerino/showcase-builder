type PublicUrlEnv = Record<string, string | undefined> & {
  AUTH_URL?: string;
  NEXTAUTH_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
};

function withProtocol(origin: string): string {
  return /^https?:\/\//i.test(origin) ? origin : `https://${origin}`;
}

export function getPublicOrigin(
  env: PublicUrlEnv = process.env,
): string {
  const origin =
    env.AUTH_URL ??
    env.NEXTAUTH_URL ??
    env.VERCEL_PROJECT_PRODUCTION_URL ??
    env.VERCEL_URL ??
    "http://localhost:3000";

  return withProtocol(origin).replace(/\/+$/, "");
}

export function buildPublicUrl(path: string, env?: PublicUrlEnv): string {
  return new URL(path, getPublicOrigin(env)).href;
}
