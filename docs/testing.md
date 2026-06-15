# Testing

## Current Coverage

- Unit and component tests run with Vitest.
- Database access is mocked in action/query tests; tests do not depend on a real Neon database.
- Product extraction tests use mocked fetch/DNS and parser fixtures instead of real external requests.

## Commands

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Critical Flows Covered

- Auth form validation.
- Live create/edit/publish/unpublish/delete action behavior.
- Product create/edit/delete/reorder/move authorization behavior.
- Product link extraction success, errors, SSRF guard, cache and rate limit.
- Public showcase query, cache tags, product display, filtering and sharing.

## E2E Status

Playwright is not configured in this repository. Adding E2E would require an isolated test database and seed/cleanup strategy, so it is intentionally left out of this phase rather than pointing tests at a shared Neon database.
