# Security Notes

## Authentication And Authorization

- `/admin/*` is protected by `src/proxy.ts` and checked again in the admin layout.
- Every Server Action reads the user id from the session and scopes database writes by owner.
- Product mutations verify the `product -> live -> user` chain on the server.
- Passwords are stored only as bcrypt hashes and are never returned to the client.

## Product Link Fetching

- `/api/products/extract` runs on the Node.js runtime and requires a session.
- Only exact allowlisted `http(s)` hosts are accepted.
- Redirects are followed manually; every hop is validated for scheme, host and resolved IP.
- Private, loopback, link-local and reserved IP ranges are blocked.
- The fetch uses a fixed `GET`, no client cookies, no Authorization header, a timeout, redirect cap and response-size cap.
- Raw HTML, cookies and response headers are not stored.
- Cache entries store only extracted fields and safe metadata needed for lookup.

## Logs And Secrets

- Logs must not include password hashes, database URLs, raw HTML, request headers or full product URLs with tracking data.
- No secret uses `NEXT_PUBLIC_`.
- Security headers are configured in `next.config.ts`; CSP is intentionally not added until it can be tested without breaking Auth.js, images and Next.js internals.

## Operational Cleanup

- `product_extraction_cache` expires rows by `expires_at`; schedule periodic cleanup in the database or platform cron.
- `extraction_rate_limits` can be cleaned by old `window_start` values after the active window is safely past.
