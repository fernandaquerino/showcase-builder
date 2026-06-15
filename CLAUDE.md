# CLAUDE.md

This project's canonical instructions live in **AGENTS.md**. Read it first.

@AGENTS.md

---

## Claude Code specifics

- **Interaction language:** the developer (Fernanda) talks to you in **Brazilian Portuguese**. Reply in PT-BR. Code, identifiers, comments, and commit messages stay in **English**.
- **Plan before big changes.** For anything touching the schema, auth, or the extraction path, outline the plan and wait for confirmation before editing.
- **Definition of done:** `pnpm typecheck` and `pnpm lint` pass, and the change is scoped to one phase of the roadmap. Don't mark work done with type or lint errors outstanding.
- **Small, focused commits**, one concern each. Conventional-commit style (`feat:`, `fix:`, `chore:`).
- **Don't build tooling instead of features.** Stay on the roadmap phase at hand; flag scope creep instead of acting on it.
- **Verify, don't assume.** Before implementing C&A link extraction, run the empirical `curl` test described in AGENTS.md and report what you find.
- **Keep these files current.** When a real decision changes the architecture or conventions, update AGENTS.md in the same change.

## Don't

- Don't commit secrets or `.env`.
- Don't add a headless browser to extraction without confirming the static-HTML test failed.
- Don't skip ownership checks on mutations.
- Don't let the public page accumulate client-side JS.
