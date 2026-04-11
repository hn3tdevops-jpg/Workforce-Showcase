Frontend workspace setup and validation

Install dependencies (workspace root):
- pnpm install -w

Build the workspace (recommended before preview):
- pnpm -w build

Run typecheck only:
- pnpm run typecheck:libs  # runs tsc --build at workspace root
- pnpm run typecheck       # workspace-wide typecheck (includes artifacts/scripts)

Run tests (Playwright & other workspace tests):
- pnpm -w test
- For Playwright only: npx playwright test

Start dev server (live reload):
- pnpm --filter "./artifacts/workforce-console" -w run dev

Preview built app (production-like):
- PORT=5173 BASE_PATH=/ pnpm --filter "./artifacts/workforce-console" -w run serve

Verify a successful preview:
- curl -I http://127.0.0.1:5173/  # should return HTTP 200
- curl -I http://127.0.0.1:5173/login  # SPA fallback should return HTTP 200

Common environment variables
- PORT: preview server port (required by vite.config.ts)
- BASE_PATH: base path the app is served from (required by vite.config.ts)
- VITE_API_PROXY_TARGET: override backend proxy target for local testing

Troubleshooting tips
- "PORT environment variable is required": set PORT before running preview.
- "BASE_PATH environment variable is required": set BASE_PATH (use / for root).
- If API endpoints return 500/404: backend issue — point VITE_API_PROXY_TARGET to a local mock if needed.
- If builds fail in CI but not locally, confirm node/pnpm versions and lockfile consistency (pnpm install -w --lockfile-only behavior).

Validation checklist for reviewers
- [ ] pnpm install -w runs without errors
- [ ] pnpm -w build completes and artifacts are produced in artifacts/*/dist/public
- [ ] Preview serves at configured PORT and returns 200 for arbitrary SPA routes
- [ ] API proxy forwards requests to VITE_API_PROXY_TARGET

Contact
- For frontend infra issues, open an issue in the repo and tag @frontend-team.
