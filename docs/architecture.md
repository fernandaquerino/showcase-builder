# Architecture

Live Showcase Builder is a Next.js App Router application with three surfaces:

- Public marketing/home pages.
- Private creator panel under `/admin`.
- Public showcase pages under `/{handle}` and `/{handle}/{slug}`.

## Data Flow

- Creators authenticate with Auth.js.
- Server Components load scoped admin data from Drizzle queries.
- Server Actions validate input with Zod, verify ownership and mutate PostgreSQL.
- Public pages read only published live data and products ordered by position.

## Public Showcase

- `/{handle}` shows the creator's current published live or an empty public state.
- `/{handle}/{slug}` shows one specific published live and returns not found for an unmatched slug.
- Public data is cached with tags from `src/server/cache/showcase.ts`.
- Publish, unpublish, edit and product mutations revalidate only the affected public paths/tags.

## Product Link Extraction

- The client sends only the pasted product link to `/api/products/extract`.
- The route validates the URL, enforces rate limit/cache, fetches safe HTML and parses JSON-LD/Open Graph/basic metadata.
- The product form applies extracted values only to empty untouched fields; manual entry always remains available.
