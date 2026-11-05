<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Keep documentation current

When changing SETU, update `README.md` and the documents in `docs/` that describe the affected feature in the same change. Update setup commands, environment variables, permissions, limits, and examples when their behavior changes.

- `docs/FEATURES.md` covers user-facing features and their status.
- `docs/WALKTHROUGH.md` follows the product flows and their code paths.
- `docs/FRONTEND.md` explains UI components, styles, accessibility, and motion.
- `docs/BACKEND.md` explains authentication, APIs, services, and maintenance.
- `docs/DATABASE.md` describes tables, constraints, indexes, and migrations.
- `docs/SYSTEM.md` explains system boundaries, data flows, and scaling limits.

Keep implementation and documentation consistent. State which integrations require configuration and which behavior is unverified. Check that documentation links and commands still point to the current project.
