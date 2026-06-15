# AGENTS.md

Canonical, tool-agnostic guide for any AI coding agent working in this repo.
Keep it concise and specific. Full architecture lives in `docs/technical-spec.md` — read it on demand when you need detail, don't assume.

---

## Project

**Live Showcase Builder** — a simple WordPress-style page builder for content creators (live-stream sellers).
A creator builds the product showcase of her live in an admin, publishes it, and shares a mobile-first public page with her followers.
Reference output: `https://pambraga-live.vercel.app/`.

Two audiences: **creators** (non-technical, use the admin) and **followers** (mobile, consume the public page). Optimize the admin for zero friction and the public page for speed + clarity.

---

## Tech stack

- **Next.js (App Router, RSC)** — latest stable
- **TypeScript** in `strict` mode
- **Tailwind CSS + shadcn/ui** (mobile-first)
- **Auth.js (NextAuth v5)** — Credentials (email/password) + Google
- **Drizzle ORM + PostgreSQL** (Neon / Vercel Postgres)
- **Zod** for all validation; **React Hook Form** in admin forms
- **dnd-kit** for product reordering
- **cheerio** for HTML/JSON-LD parsing (link extraction)
- **next/image** for images
- Deploy: **Vercel** (ISR + on-demand revalidation)

Package manager: **pnpm** (adjust commands if using npm/bun).

---

## Commands

```bash
pnpm dev            # local dev server
pnpm build          # production build
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm db:generate    # drizzle-kit generate (after schema change)
pnpm db:migrate     # drizzle-kit migrate
pnpm db:studio      # drizzle studio
```

Before considering any task done: `pnpm typecheck` and `pnpm lint` must pass.

---

## Structure

```
src/
├── app/
│   ├── (public)/
│   │   └── [handle]/
│   │       ├── page.tsx          # página pública da live (ISR)
│   │       └── not-found.tsx
│   ├── admin/
│   │   ├── layout.tsx            # guard de autenticação
│   │   ├── page.tsx              # lista de lives
│   │   └── lives/
│   │       └── [liveId]/
│   │           └── page.tsx      # editor da live (page builder)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       └── products/extract/route.ts   # extração de metadados do link
├── components/
│   ├── ui/                       # shadcn/ui
│   ├── admin/                    # builder, ProductForm, SortableList...
│   └── public/                   # ProductCard, CategoryFilter, ShareBar...
├── server/
│   ├── actions/                  # Server Actions (lives, products)
│   ├── db/                       # drizzle schema + client
│   └── lib/extract/              # parser JSON-LD / OG / cheerio
├── lib/
│   ├── auth.ts                   # config Auth.js
│   ├── validations/              # schemas Zod
│   └── utils.ts
└── middleware.ts                 # protege /admin
```

---

## Data model

`User ──< Live ──< Product`

- **users**: `id, email, name, handle (unique slug), avatar_url, password_hash?, created_at`
- **lives**: `id, user_id, title, live_date, live_time?, cover_image_url?, instagram_url?, slug, status('draft'|'published'), published_at?, timestamps` — unique `(user_id, slug)`
- **products**: `id, live_id, name, category, size?, color?, image_url, product_url, price?, position, source_url?, created_at`

Categories are a free-text field on each product. Public filters are derived at runtime from distinct `category` values — there is no categories table.

---

## Domain rules (do not violate)

1. **One published live per creator at a time.** Publishing a live unpublishes the others.
2. **Link extraction runs server-side only** (Server Action / Route Handler), never in the client.
3. **Manual fallback is mandatory.** Extraction pre-fills name/image; the creator can always edit everything and upload her own image. Never block product creation if extraction fails.
4. **Public page is ISR.** On publish/unpublish/edit, trigger `revalidatePath`/`revalidateTag`. The public page is read-only.
5. **Authorization on every mutation.** Every Server Action that touches `lives`/`products` must verify the resource belongs to the session user. Never trust client-supplied IDs.

---

## ⚠️ The hard part: C&A link extraction

There is **no official public C&A catalog API**. The links creators paste (`minhacea.cea.com.br/?lcea=CODE`) are affiliate links that **redirect** to the product page. "Fetching from the C&A API" means **extracting metadata from the destination HTML**:

1. `fetch(url, { redirect: 'follow' })` to resolve the affiliate redirect to the real product URL.
2. Parse the HTML in this order: **JSON-LD** (`@type: "Product"` → name, image, offers.price, color) → **Open Graph** (`og:title`, `og:image`, `product:price:amount`) → basic meta.
3. If the page is JS-rendered and `fetch` returns no product data, a headless browser is the _contingency only_ (`@sparticuz/chromium` on Vercel) — heavy, avoid unless proven necessary.

**Before building this, verify empirically** whether the resolved product page exposes JSON-LD/OG in static HTML (`curl` the final URL). That test decides whether a headless browser is needed.

**Security — the extract route fetches a user-supplied URL (SSRF risk):**

- Allow only `http(s)`; block localhost, private/internal IP ranges.
- Enforce a timeout and a max response size.
- Rate-limit the route.

Cache extraction results by URL to avoid refetching on edits.

---

## Conventions

- Validate every form and API input with Zod; infer types from schemas.
- Prefer Server Actions over API routes for mutations; keep secrets server-side.
- Keep the public page light: minimal client JS (only the category filter needs interactivity); rely on RSC/ISR.
- Mobile-first: style the smallest breakpoint first, scale up with `sm:`/`md:`.
- Use `next/image` with proper `sizes`; `priority` only above the fold.
- Code, identifiers, and comments in English.
- Leave formatting to ESLint/Prettier — don't hand-format.

---

## Environment

`.env` keys: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, optional `BLOB_READ_WRITE_TOKEN`.
Never commit secrets. Never log password hashes or return them in any response.

---

## Ask before

- Changing the DB schema or running destructive migrations.
- Adding a new dependency.
- Introducing a headless browser or any heavy runtime to the extraction path.

## Build order

Follow the phased roadmap in `docs/technical-spec.md` (§11): Setup → Lives CRUD → Products (manual) → Link extraction → Public page → Polish. Build product cards manually before wiring extraction.
