# Frontend repository instructions

This repository is the active frontend workspace for the Workforce project.

## Scope
- Work only in this repository unless the task explicitly requires otherwise.
- Do not modify backend code, API server code, database migrations, deployment configs, or unrelated repositories.
- Prefer changes under frontend app code, artifacts, docs/ADMIN/frontend, scripts, and local preview/wrapper tooling.

## Priorities
1. Fix frontend-only typecheck and build failures.
2. Stabilize local preview and SPA routing behavior.
3. Improve developer hub navigation and docs-library UX.
4. Keep documentation current under docs/ADMIN/frontend.
5. Prefer small, reviewable diffs with validation steps.

## Technical guidance
- Respect the existing TypeScript, React, Vite, pnpm, and project-reference setup.
- Do not weaken package boundaries just to suppress type errors.
- Prefer fixing generator/config/export problems at the source instead of patching generated files, unless explicitly asked for a temporary unblock.
- Avoid broad root workspace config changes unless strictly necessary for a frontend-only fix.
- Preserve client-side routing fallback behavior for nested routes.

## Local preview expectations
Support and document:
- pnpm dev
- pnpm preview
- simple static serving where valid
- Flask app.py SPA fallback wrapper when needed

## Docs expectations
- Keep docs concise, operational, and current.
- Update progress/status docs when a meaningful frontend milestone is completed.
- Document exact validation commands and expected results.

## Safety rails
- Do not commit secrets, tokens, machine-specific credentials, or private URLs into application code.
- Do not rewrite large areas when a narrow fix is sufficient.
- Do not change deployment settings unless explicitly requested.
