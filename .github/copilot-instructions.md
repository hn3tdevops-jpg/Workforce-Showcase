# Copilot instructions for this repository

Purpose: short, actionable guidance for Copilot sessions working in this monorepo.

---

## Build, test, and lint commands
- Package manager: pnpm (preinstall enforces pnpm). Use pnpm from the repo root.
- Full workspace typecheck: `pnpm run typecheck` (top-level script runs project references).
- Full workspace build: `pnpm run build` (runs typecheck then per-package builds if present).

Per-package common commands (run from package directory or via pnpm filter):
- Typecheck a single package: `pnpm --filter <package> run typecheck` or `cd <package> && pnpm run typecheck`.
- Build a single package: `pnpm --filter <package> run build` or `cd <package> && pnpm run build`.
- Frontend dev (workforce-console): `pnpm --filter @workspace/workforce-console run dev` or `cd artifacts/workforce-console && pnpm run dev`.
- Preview built frontend: `cd artifacts/workforce-console && pnpm run serve` (if package has a serve script).

Testing and linting:
- No repository-wide `test` or `lint` scripts detected. If a package provides tests, run them per-package with `pnpm --filter <package> run test`.
- To run a single test file when a test runner exists in a package: `pnpm --filter <package> run test -- <path/to/test>` (most runners forward args).

Serving built site (static SPA):
- A small Flask app (app.py) serves the `dist/` directory. Run with Flask: `python -m flask run --host=0.0.0.0 --port=5000 --app app` or use a WSGI server: `gunicorn app:application -w 4 -b 0.0.0.0:5000`.

---

## High-level architecture
- Monorepo managed with pnpm workspaces. Packages live under `lib/` (libraries) and `artifacts/` (apps/targets).
- Frontend: `artifacts/workforce-console` is a Vite + React app; build output lands in `dist/` (top-level) and is served by `app.py` for a simple static preview.
- Type system: TypeScript project references are used (see `tsconfig.json` and `tsconfig.base.json`) to enable repo-wide typechecking.
- Backend tooling: `lib/db` uses Drizzle ORM for schema/DB migrations (`drizzle-kit` scripts in that package).
- Docs & Copilot assets: `docs/planning/` contains a Copilot-friendly planning/execution pack (templates, install prompts). It should be kept when installing planning helpers.

---

## Key conventions and patterns
- pnpm enforced: preinstall script will fail if not running under pnpm. Use pnpm for installs and workspace commands.
- Package naming: internal packages use `@workspace/*` and `workspace:*` references.
- "catalog:" and workspace placeholders: some dependencies use `catalog:` placeholders or `workspace:*` for local linking — CI/installation may require catalog registry or installing via pnpm workspaces.
- Typecheck-first build: the top-level `build` script runs typecheck before package builds; avoid bypassing typecheck when publishing builds.
- Per-package scripts: not all packages expose `build` or `test` — check the package's package.json before assuming availability.
- Dist-serving SPA: `app.py` serves static assets from `dist/`. The SPA fallback route returns `index.html` for unknown paths.
- Database operations: `lib/db` contains `drizzle-kit` scripts (`push`, `push-force`) — run them from that package.
- Frontend dev workflow: use `artifacts/workforce-console`'s `dev` script (Vite) during development; builds go to the app's dist for production packaging.
- Documentation pack: `docs/planning/` contains COPILOT install prompts (`copilot_install/`); Copilot sessions should prefer these templates when adding planning docs.

---

## Files and places to check quickly
- Root: `package.json` (workspace scripts), `tsconfig.json` (references), `app.py` (static server), `dist/` (built frontend)
- Frontend app: `artifacts/workforce-console/package.json` (dev/build/serve)
- DB: `lib/db/package.json` (drizzle scripts)
- Docs/Copilot pack: `docs/planning/` (templates, install prompts, README)

---

## When adding or running Copilot tasks
- Keep changes small and package-scoped; prefer adding per-package scripts rather than changing top-level behavior.
- If installing or updating docs, preserve `docs/planning/` files and the `COPILOT_INSTALL_*` prompts — they are intentionally Copilot-focused.
- Respect tenant/RBAC rules documented in the planning pack when proposing backend/studio changes.

---

(Automatically generated guidance. Update this file when the repo gains common test/lint scripts or additional tooling.)
