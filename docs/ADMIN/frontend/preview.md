Previewing the Workforce Console (developer docs)

Purpose
- How to run the built preview locally and troubleshooting notes for common issues.

Basic steps
1. Install dependencies (workspace root):
   pnpm install -w

2. Build the workspace (optional if artifacts already built):
   pnpm -w build

3. Start Vite preview for the console (recommended):
   # from workspace root
   PORT=5173 BASE_PATH=/ pnpm --filter "./artifacts/workforce-console" -w run serve

   This serves the built app at http://127.0.0.1:5173

Required environment variables for preview
- PORT (required): port for dev/preview server (e.g., 5173)
- BASE_PATH (required): base path the app is served from (e.g., /)
- VITE_API_PROXY_TARGET (optional): override backend proxy target for local API testing (defaults to remote configured value)

Troubleshooting
- Error: "PORT environment variable is required but was not provided"
  - Ensure PORT is set in the environment before running the preview command.

- Error: "BASE_PATH environment variable is required but was not provided"
  - Set BASE_PATH=/ unless a subpath is used.

- API requests returning 500 or 404 when proxied:
  - The Vite preview proxies to the configured target (see vite.config.ts). Set VITE_API_PROXY_TARGET to point at a local mock server if you need a healthy backend for integration testing, e.g.:
    VITE_API_PROXY_TARGET=http://localhost:8080 PORT=5173 BASE_PATH=/ pnpm --filter "./artifacts/workforce-console" -w run serve
  - Backend errors (500) indicate server-side issues — inspect backend logs or use a local mock.

- If vite preview exits immediately, inspect the detached log files created by the helper scripts (e.g., /tmp/copilot-detached-*.log) for the failure reason.

Notes
- pnpm workspace scripts may run multiple projects; setting FILTER (pnpm --filter) limits runs to the console package.
- For local development with live reload, use the dev script instead:
  pnpm --filter "./artifacts/workforce-console" -w run dev

