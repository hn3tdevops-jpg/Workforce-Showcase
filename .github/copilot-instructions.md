# Copilot instructions for this repository

Purpose: concise, actionable guidance to help Copilot-style assistants work in this monorepo.

---

## Build, test, and lint commands
- Package manager: pnpm is enforced by the root preinstall. Always run pnpm from the repo root.
- Full workspace typecheck: `pnpm run typecheck` (runs project references).
- Full workspace build: `pnpm run build` (runs typecheck then per-package builds when present).

Per-package commands (use from repo root or package directory):
- Typecheck a single package: `pnpm --filter <package> run typecheck` or `cd <package> && pnpm run typecheck`.
- Build a single package: `pnpm --filter <package> run build` or `cd <package> && pnpm run build`.
- Frontend dev (workforce-console): `pnpm --filter @workspace/workforce-console run dev` or `cd artifacts/workforce-console && pnpm run dev`.
- Preview built frontend (when built to top-level `dist`): `cd artifacts/workforce-console && pnpm run serve` (if the package exposes `serve`).

Testing and linting:
- No repo-wide `test` or `lint` scripts were detected. Run package tests explicitly: `pnpm --filter <package> run test`.
- Run a single test file (runners typically forward args): `pnpm --filter <package> run test -- <path/to/test>`.

Serving built site (static SPA):
- A small Flask app serves the top-level `dist/`. Run: `python -m flask run --host=0.0.0.0 --port=5000 --app app` or with Gunicorn: `gunicorn app:application -w 4 -b 0.0.0.0:5000`.

---

## High-level architecture
- Monorepo with pnpm workspaces. Libraries under `lib/`, apps and targets under `artifacts/`.
- Frontend app: `artifacts/workforce-console` is a Vite + React SPA. Production builds land in the repo root `dist/` and are served by `app.py` for quick previews.
- TypeScript: project references are used (see `tsconfig.json`, `tsconfig.base.json`) so typechecking runs across packages.
- Database tooling: `lib/db` uses Drizzle ORM; schema/migration scripts are in that package (`drizzle-kit` tasks `push`, `push-force`).
- Developer docs and Copilot assets: `docs/planning/` contains templates and `copilot_install/` prompts intended for Copilot-driven workflows.

---

## Key conventions and repository-specific patterns
- pnpm-first: root `preinstall` enforces pnpm; CI and dev machines must use pnpm to install correctly.
- Internal package references: packages reference local libs with `@workspace/*` and `workspace:*` tokens; prefer pnpm filters over manual path edits.
- Catalog placeholders: some deps use `catalog:` placeholders for internal registries — CI may require access to that registry or workspace linking.
- Typecheck-first builds: the top-level `build` script runs typecheck before package builds; do not bypass typecheck when producing builds.
- Per-package script variability: not every package defines `build`/`test`/`serve`; inspect package.json before invoking scripts.
- Dist serving: `app.py` implements an SPA fallback and static routes for `/assets` and `/images` — use it to preview `dist/` output.
- DB push workflow: run `pnpm --filter @workspace/db run push` (or `push-force`) from the repo root or cd into `lib/db`.
- Frontend conventions: `artifacts/workforce-console` uses Vite; use its `dev`, `build`, and `serve` scripts for local development and previews.

---

## AI assistant / agent config scan
Checked for known assistant configs and integrated relevant behavior:
- CLAUDE.md: not present
- .cursorrules / .cursor/rules: not present
- AGENTS.md: not present
- .windsurfrules: not present
- CONVENTIONS.md / AIDER_CONVENTIONS.md: not present
- .clinerules / .cline_rules: not present

If these files are later added, include any agent-specific instructions here (authentication notes, allowed tool patterns, or repo-specific prompts).

---

## Recommended usage for Copilot sessions
- Keep edits small and package-scoped. When adding scripts, prefer per-package scripts rather than changing top-level behavior.
- Preserve `docs/planning/` and any `COPILOT_INSTALL_*` prompts when authoring documentation for Copilot workflows.
- When asked to run workspace commands, prefer `pnpm --filter` to limit scope and save time.

---

## MCP servers (Playwright)
- Playwright appears in devDependencies at the repo root. If Playwright test orchestration or browser automation is needed for Copilot-guided testing, configure an MCP (Playwright) server.

Would you like Copilot to configure a Playwright MCP server for this repo? (Yes/No)

---

Summary: updated Copilot instructions in .github/copilot-instructions.md to consolidate build/test/run commands, architecture notes, repo-specific conventions, and an AI-config scan. Update this file when the repo adds new scripts or CI behaviors.
