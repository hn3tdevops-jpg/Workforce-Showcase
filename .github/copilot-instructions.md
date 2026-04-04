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
- A small Flask app serves the top-level `dist/`.
  - `python -m flask --app app run --host=0.0.0.0 --port=5000`
  - `gunicorn app:app -w 4 -b 0.0.0.0:5000`.

---

## High-level architecture
- Monorepo with pnpm workspaces. Libraries live under `lib/`, apps and deployable targets under `artifacts/`.
- Frontend app: `artifacts/workforce-console` is a Vite + React SPA. The per-package build typically outputs to `artifacts/workforce-console/dist/public`. Verify the configured output path in the package build config if different. Operational artifacts are copied to the repo root `dist/` for serving. `app.py` serves the top-level `dist/` with SPA fallback for quick previews.
- TypeScript: project references are used (see `tsconfig.json`, `tsconfig.base.json`) so typechecking runs across packages and is enforced before builds.
- Database tooling: `lib/db` uses Drizzle ORM; schema/migration scripts live in that package (drizzle-kit tasks: `push`, `push-force`).
- Operational artifact workflow: artifacts are archived under `artifacts/operational/<timestamp>/` and checksums are recorded. A helper script `scripts/restore_operational_artifact.sh` is provided to restore archived artifacts into `dist/` for rollbacks.
- Developer docs and Copilot assets: `docs/planning/` contains the planning & Copilot install pack (`copilot_install/`) used to bootstrap planning templates and guidance.


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

Playwright MCP: a local helper script was added at `scripts/mcp/start-playwright-mcp.sh`. Run it to install browsers and start Playwright in watch mode.

CI and runner dependencies: GitHub Actions runners and other Ubuntu/Debian hosts may require additional OS packages for Playwright browsers. Run `pnpm exec playwright install-deps` on the runner (or locally) to install those system packages. Check workflows `.github/workflows/playwright-browser-validation.yml` and `.github/workflows/frontend-wrapper-e2e.yml` for examples of this step in CI.

Example commands (Ubuntu/Debian):

  pnpm install --frozen-lockfile
  pnpm exec playwright install-deps
  pnpm exec playwright install --with-deps

---

## Quick troubleshooting pointers for Copilot sessions

- When running workspace commands, prefer `pnpm --filter` to limit scope (faster and safer).
- If Playwright tests fail in CI, confirm browsers are installed with `pnpm exec playwright install --with-deps` (or `pnpm exec playwright install`).
- If build output isn't in `dist/`, check `artifacts/workforce-console` build output path — builds sometimes output to `artifacts/workforce-console/dist/public` and are later copied into root `dist/`.

---

## 1) Single test execution examples (copy/paste)

- Run package test (scoped) from repo root:
  - pnpm --filter <package> run test -- <path/to/test>
  - Example: pnpm --filter @workspace/workforce-console run test -- tests/unit/example.test.ts

- Run package test from package dir:
  - cd artifacts/workforce-console && pnpm run test -- <path/to/test>

- Playwright examples (run from repo root if Playwright is installed at root; otherwise run inside the package dir):
  - Run a spec file: pnpm exec playwright test tests/<spec>.spec.ts
  - Run a named test: pnpm exec playwright test -g "<test name>"
  - Run a specific browser project: pnpm exec playwright test --project=chromium

Note: replace `pnpm exec playwright` with `cd artifacts/workforce-console && pnpm exec playwright` if Playwright is configured per-package.

---

## 2) Build / preview / serve commands (copy/paste)

- Install deps (repo root):
  - pnpm install

- Full workspace build (repo root):
  - pnpm run build

- Workspace typecheck (repo root):
  - pnpm run typecheck

- Per-package dev / build / serve (examples for workforce-console):
  - Dev server: pnpm --filter @workspace/workforce-console run dev
  - Build: pnpm --filter @workspace/workforce-console run build
  - Preview/serve built site (package): pnpm --filter @workspace/workforce-console run serve

- Preview built site via app.py (serves top-level dist/ with SPA fallback):
  - From repo root (when dist/ exists): `python -m flask --app app run --host=0.0.0.0 --port=5000`
  - Gunicorn preview (production-like): `gunicorn app:app -w 4 -b 0.0.0.0:5000`

---

## 3) Playwright environment setup (copy/paste)

- Install Playwright browsers (repo root):
  - pnpm exec playwright install
- Install OS-level dependencies (Linux CI / Ubuntu/Debian):
  - pnpm exec playwright install-deps

Note: MCP servers are optional. Normal Playwright usage and CI runs do not require an MCP server; ensure browsers and deps are installed on the runner instead.

---

## 4) Artifact / archive workflow (commands + notes)

- Operational artifact archives location (example):
  - artifacts/operational/<timestamp>/

- Create an archive (example operator steps):
  - TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"; mkdir -p "artifacts/operational/$TIMESTAMP"; rsync -av --delete dist/ "artifacts/operational/$TIMESTAMP/"; find "artifacts/operational/$TIMESTAMP" -type f -print0 | xargs -0 sha256sum > "artifacts/operational/${TIMESTAMP}-checksums.txt"

- Restore (rollback) script:
  - scripts/restore_operational_artifact.sh "artifacts/operational/<timestamp>"
  - Or manual restore: rsync -av --delete "artifacts/operational/<timestamp>/" dist/

- Canonical source vs built dist vs archived operational artifact:
  - Canonical source: repository source code (artifacts built from sources in `artifacts/workforce-console` or other packages).
  - Built `dist/`: the runtime/serving directory placed at repo root for quick previews and deployments.
  - Archived operational artifact: timestamped copy under `artifacts/operational/` used for rollbacks and provenance.

---

## 5) CI / workflow pointers (files & purpose)

- Relevant workflow files (examples to check):
  - .github/workflows/frontend-wrapper-e2e.yml — frontend e2e wrapper and artifact validation.
  - .github/workflows/playwright-browser-validation.yml — installs deps, sets up browsers, and runs Playwright browser tests.
  - (Check repo for other workflows in .github/workflows/ that may run typecheck, build, or publish steps.)

- What they validate:
  - Typechecking and build correctness, Playwright browser tests, and any package-specific test suites.

- Logs and artifacts:
  - Failed runs typically upload test logs and Playwright traces/videos/artifacts to the workflow run's artifacts section in GitHub Actions. Inspect the run's Artifacts and Logs tabs for details.

---

## 6) Troubleshooting notes (fast checks)

- pnpm / lockfile issues:
  - If `pnpm install` errors because of lockfile or registry, ensure `pnpm` is used (root preinstall blocks npm/yarn) and the registry/config for `catalog:` packages is available.

- Missing Playwright browser binaries:
  - Symptoms: Playwright tests fail with browser not found. Fix: pnpm exec playwright install (and install-deps on Linux CI).

- Static asset path or SPA fallback issues:
  - Symptoms: index.html loads but assets 404 or app shows blank. Check that built asset filenames exist under `dist/assets/` and that `app.py` is serving the correct `dist/` directory.

- Port conflicts:
  - Symptoms: flask/gunicorn/vite dev fail to bind. Fix: ensure target port is free or change host port (e.g., --port 5001).

- Build passes but served app is blank:
  - Check browser console for JS errors (see repo root files browser-console-errors.txt and playwright-or-browser-test-log.txt for examples).
  - Confirm correct `dist/` contents and that `index.html` references the expected asset filenames (hashes). Use checksum of files or `ls -la dist/assets` to confirm presence.

---

Summary

Added concise, copy-paste-ready examples for testing, building, Playwright setup, artifact workflow, CI pointers, and troubleshooting. Keep these examples updated alongside package.json and CI workflows if script names or output paths change.
