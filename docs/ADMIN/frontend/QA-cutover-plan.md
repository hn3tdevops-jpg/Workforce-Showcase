QA Cutover Plan — Canonical Build Validation

Goal
- Validate the canonical build (workforce_new) before any production cutover from the operational artifact. Provide deterministic smoke tests, pre-cutover verification, and exact rollback steps using the archived operational artifact.

Pre-cutover verification (read-only, non-destructive)
1. Confirm archive presence and checksums
   - Verify archived artifact exists: /home/hn3t/workforce_frontend_app/docs/ADMIN/frontend/ARTIFACT_ARCHIVE/workforce-console-archive
   - Verify checksums match recorded file: docs/ADMIN/frontend/ARTIFACT_ARCHIVE/checksums-archive.txt
     Command: sha256sum /home/hn3t/workforce_frontend_app/docs/ADMIN/frontend/ARTIFACT_ARCHIVE/workforce-console-archive/assets/*
     Compare with checksums file.
2. Build canonical artifact in an isolated environment (CI or local dev container)
   - From: /home/hn3t/workforce_new/packages/workforce/workforce/frontend
   - Commands:
     - npm ci --no-audit --no-fund
     - npm run build
   - Collect produced artifacts: dist/
   - Record checksums: sha256sum dist/assets/* > /tmp/canonical-checksums-$(date -u +%Y%m%dT%H%M%SZ).txt
3. Binary diff and file-list diff
   - Produce checksum and file-list diffs vs operational artifact (already stored under docs/ADMIN/frontend/artifact-diffs/).
   - Confirm only expected differences (e.g., different build-time hashes) or identify missing files.
4. Sanity-check environment configuration
   - Verify build uses intended package manager/lockfile (pnpm vs npm). If canonical uses npm but operational artifact expects workspace deps, document missing dependencies.

Staging verification (perform in staging environment, not prod)
1. Deploy canonical dist to a staging host that mirrors production (e.g., container or separate /dist path)
   - Use the same wrapper (app.py) or equivalent reverse proxy config.
   - Example staging folder: /home/hn3t/workforce_frontend_app/dist-staging
   - Copy canonical dist into staging path.
2. Smoke tests (automated commands)
   - HTTP sanity:
     - curl -fsS -o /dev/null -w "%{http_code}" https://staging.example.com/ => expect 200
     - curl -fsS https://staging.example.com/ | grep -q "<title" => returns 0
   - Asset load:
     - curl -fsS https://staging.example.com/assets/index-*.js -I | grep -q "200" => expect 200
   - JS execution basic check (headless):
     - Use Playwright or Puppeteer to load / and assert no console errors and that main app element exists (e.g., #root or #app).
   - API integration smoke:
     - curl -fsS https://staging.example.com/api/health => expect 200 and JSON {"status":"ok"} (replace with actual endpoint used by backend)
     - Example fallback: curl -fsS https://staging.example.com/api/version
   - End-to-end user flow (manual/automated):
     - Login as demo user — create a small task or navigate to Rooms by location and assert expected UI responses.
3. Performance quick-check
   - Measure page load time and bundle size; compare to operational artifact to detect large regressions.
   - Commands: curl -s https://staging.example.com/ | wc -c (page size) and compare.

Pre-cutover checklist (pass all before scheduling cutover)
- [ ] Artifact archive presence & checksums validated
- [ ] Canonical build reproduced locally/CI and checksums recorded
- [ ] Staging deploy successful and smoke tests pass (HTTP, assets, API, basic E2E)
- [ ] QA sign-off documented (comments + timestamp)
- [ ] Rollback steps verified in staging (test restoring archived artifact)

Cutover window (operational steps; performed by operator during scheduled maintenance)
1. Prepare maintenance window and traffic routing (if applicable)
2. Backup current deployed dist (optional additional archive)
   - cp -a /home/hn3t/workforce_frontend_app/dist /home/hn3t/workforce_frontend_app/dist-backup-$(date -u +%Y%m%dT%H%M%SZ)
3. Deploy canonical dist to prod (dry-run recommended in staging first)
   - rsync -av --delete /path/to/canonical/dist/ /home/hn3t/workforce_frontend_app/dist/
4. Verify quick smoke (curl /, assets, key API endpoints)

Post-cutover checks (immediately after cutover)
- [ ] index.html served (curl -fsS https://prod.example.com/ returns 200)
- [ ] Main JS asset served (curl -I https://prod.example.com/assets/index-*.js -> 200)
- [ ] API endpoints return expected status
- [ ] Key user flows tested (create/assign/complete task; inspector flow; dashboard counts)
- [ ] No console errors in critical pages (optional headless check)
- [ ] Telemetry/Logs monitored for 30 minutes for errors/exceptions

Rollback steps (exact commands using archived operational artifact)
1. If any critical failure occurs, restore archived operational artifact (archive path used in this repo):
   - rsync -av --delete /home/hn3t/workforce_frontend_app/docs/ADMIN/frontend/ARTIFACT_ARCHIVE/workforce-console-archive/ /home/hn3t/workforce_frontend_app/dist/
2. Verify checksum after restore:
   - sha256sum /home/hn3t/workforce_frontend_app/dist/assets/*
   - Compare results to docs/ADMIN/frontend/ARTIFACT_ARCHIVE/checksums-archive.txt
3. Restart wrapper (if applicable) or reload process managing the static server.
4. Run post-rollback smoke tests (same as post-cutover checks).

Acceptance criteria for cutover success
- All post-cutover checks pass
- No new critical errors in logs for 30 minutes
- Business-critical flows validated by QA

Notes and caveats
- Replace example URLs (staging.example.com / prod.example.com) with actual hostnames or use same-origin checks (curl http://localhost:PORT).
- API endpoints used in smoke tests must be confirmed with backend maintainers; adjust paths and expected payloads accordingly.
- Do not attempt a production cutover without QA sign-off and a validated rollback.

Artifacts created by this plan
- docs/ADMIN/frontend/QA-cutover-plan.md (this file)
- docs/ADMIN/frontend/artifact-diffs/checksum-diff.txt (existing)
- docs/ADMIN/frontend/artifact-diffs/file-list-diff.txt (existing)
- docs/ADMIN/frontend/ARTIFACT_ARCHIVE/checksums-archive.txt (existing)

Contact
- Maintainers: document who to notify on failure (add email/Slack channel here).