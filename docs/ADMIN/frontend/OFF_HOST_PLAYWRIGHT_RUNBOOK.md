OFF-HOST / Supported-container Playwright validation runbook

Purpose

Prepare and run a Playwright browser-capable validation of the existing dist-staging build off-host or inside a supported container. This runbook reproduces the local goals, collects evidence artifacts, and produces a pass/fail decision. Do not modify the production/dist artifacts.

Validation goals (same as on-host)
- App shell loads
- Login page renders
- Main JS bundle executes without fatal browser errors
- Key route navigation works
- Static assets (images, fonts, bundles) load
- Capture console errors, failed network requests, screenshots, and a route summary

Required artifact inputs from this repo
- dist-staging/ (the built site tree)
- scripts/playwright-run.cjs (Playwright navigation + capture script)
- Any custom static-server command you prefer (the runbook uses python http.server by default)

Evidence files to collect (place in an artifacts directory and include back in repo if desired)
- playwright-or-browser-test-log.txt
- browser-console-errors.txt
- failed-network-requests.txt
- route-validation-summary.md
- screenshots/ (one per route)

Pass / Fail criteria
- PASS: All routes visited return 200 (or expected 2xx), zero fatal console errors (no uncaught exceptions), no critical failed network requests for app bundles/assets, and screenshots show expected UI (login page, main app). If any of these fail, mark as FAIL.
- FAIL: Browser cannot be launched, pages fail to load (500/404), main JS bundle throws fatal console errors preventing app from running, or critical assets fail to load.

Option A — Use official Playwright Docker image (recommended)

Environment requirements
- Docker Engine installed (>=20.10)
- At least 2 CPU cores and 4GB RAM recommended for Chromium
- >=5GB disk free for Playwright browser artifacts
- Network access to pull the Playwright image

Exact commands (run from a machine that can run Docker)

1. Pull the Playwright image:

   docker pull mcr.microsoft.com/playwright:v1.61.0 || docker pull mcr.microsoft.com/playwright:latest

2. From the host that has a copy of the repository (with dist-staging prepared), run the container, mounting the repo and running the validation script. Adjust UID/GID if needed to retain file permissions:

   docker run --rm -it \
     -v "$(pwd)":/work -w /work \
     --shm-size=1g \
     mcr.microsoft.com/playwright:v1.61.0 \
     bash -lc "python3 -m http.server 5000 --directory dist-staging & sleep 1; node scripts/playwright-run.cjs"

3. After completion, copy artifacts from the host-mounted repo path: docs/ADMIN/frontend/artifact-diffs/

Notes:
- The Playwright image already contains Node and browsers; the run command will launch Chromium inside the container with proper libraries installed.
- If you prefer to run the validation inside the container and avoid starting the static server manually, use `npx http-server` (install in container) or use the built-in Python server as above.

Option B — Use a supported VM / runner (GitHub Actions, CI agent, or dedicated machine)

Environment requirements
- Linux x86_64 (Ubuntu 20.04/22.04 preferred) with Playwright dependencies present (libnss3, libatk1.0-0, libx11-6, libxcomposite1, libxrandr2, libxss1, libasound2, libpangocairo-1.0-0, libgtk-3-0, libcups2, libxdamage1, libxkbcommon0, libgbm1). See Playwright docs for exact list.
- Node.js 18+ or 20+ installed
- pnpm or npm available
- At least 4GB RAM recommended

Exact commands (on supported machine)

1. Ensure Node and pnpm (optional) are installed. Example using Node and npm:

   node -v
   npm -v

2. Install Playwright (inside a temporary working directory or the repo root):

   npm init -y
   npm i -D playwright
   npx playwright install chromium

3. Start a static server in the repo root (host binds to 127.0.0.1):

   python3 -m http.server 5000 --directory dist-staging &

4. Run the validation script (the repo includes scripts/playwright-run.cjs):

   node scripts/playwright-run.cjs

5. Collect artifacts from the repo: playwright-or-browser-test-log.txt, browser-console-errors.txt, failed-network-requests.txt, route-validation-summary.md, screenshots/

CI / GitHub Actions example (snippet)

- name: Checkout
  uses: actions/checkout@v4

- name: Use Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'

- name: Install Playwright and browsers
  run: |
    npm ci
    npm i -D playwright
    npx playwright install chromium

- name: Serve dist and run validation
  run: |
    python3 -m http.server 5000 --directory dist-staging &
    sleep 1
    node scripts/playwright-run.cjs

- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: playwright-artifacts
    path: |
      playwright-or-browser-test-log.txt
      browser-console-errors.txt
      failed-network-requests.txt
      route-validation-summary.md
      screenshots/

Evidence collection and retention
- Keep the artifacts directory produced by the script and attach it to the ticket/release notes.
- Route-validation summary should be the single-source summary of which routes loaded and whether console/network errors were observed.

Security and operational notes
- The container approach is preferred because the Playwright image includes the required system libraries and browsers; it avoids altering host OS.
- Do not write changes to production artifacts; run validation against a copy (dist-staging) mounted read-only if desired.

Next steps after PASS
- If PASS, update production cutover decision and run a staged rollout. Do not finalize cutover until production smoke tests pass.

Next steps after FAIL
- If FAIL due to environment (browser cannot be launched), try a different container/runner or a full VM with Playwright deps. If FAIL due to app errors, collect console logs and file a remediation ticket.
