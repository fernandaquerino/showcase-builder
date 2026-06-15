# Deployment Checklist

## Vercel

- Set `DATABASE_URL`, `AUTH_SECRET` and `AUTH_URL`.
- Set `AUTH_URL` to the production origin, for example `https://your-app.vercel.app`.
- Configure `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` together, or leave both empty.
- Configure `PRODUCT_EXTRACTION_ALLOWED_HOSTS` with exact verified hosts only.
- Keep product extraction timeout, redirect and byte limits conservative.

## Neon / PostgreSQL

- Run `npm run db:migrate` against the production database after reviewing generated SQL.
- Do not use destructive migration commands on production.
- Confirm foreign keys, unique constraints and indexes from `drizzle/` are applied.
- Plan cleanup for expired extraction cache rows and old rate-limit windows.

## Google OAuth

- Add the production callback URL:
  `https://your-domain.example/api/auth/callback/google`
- Add the local callback URL for development:
  `http://localhost:3000/api/auth/callback/google`

## Release Validation

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- Smoke test: sign up, create a live, add a product, publish, open the public link and unpublish.

## Rollback

- Prefer rolling back the Vercel deployment first.
- Avoid rolling back database migrations unless a reviewed down migration exists.
