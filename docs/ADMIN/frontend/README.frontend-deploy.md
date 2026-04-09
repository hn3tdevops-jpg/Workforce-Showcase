# Frontend Deployment README (operational canonical artifact)

This document records the operational release pipeline for the currently-deployed frontend artifact and provides explicit archive/restore/runbook steps. Do not run commands herein without following your site's change/maintenance window and backup procedures.

Operational canonical artifact (confirmed)
- Artifact (operational canonical) path:
  /home/hn3t/repo_imports/Workforce-Showcase-master/artifacts/workforce-console/dist/public
- Deployed dist path served in production:
  /home/hn3t/workforce_frontend_app/dist
- Evidence: local checksum matches, Replit artifact.toml present, and rsync copy observed in shell history.

How the artifact is produced (as recorded in artifact metadata)
- Build command (recorded in artifact metadata):
  pnpm --filter @workspace/workforce-console run build
- Artifact public dir (where production files are placed by the build/export):
  artifacts/workforce-console/dist/public

How the artifact is archived (operator-run, repo-scoped commands)
Run these commands from the repository root (/home/hn3t/workforce_frontend_app):

cd /home/hn3t/workforce_frontend_app
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE_DIR="artifacts/operational/$TIMESTAMP"
mkdir -p "$ARCHIVE_DIR"
rsync -av --delete dist/ "$ARCHIVE_DIR"/
find "$ARCHIVE_DIR" -type f -print0 | xargs -0 sha256sum > "artifacts/operational/${TIMESTAMP}-checksums.txt"
chmod +x scripts/restore_operational_artifact.sh
echo "$TIMESTAMP"

Notes:
- The archive is created under artifacts/operational/<timestamp>/ within this repository to keep provenance local and reversible.
- The generated checksum file is artifacts/operational/<timestamp>-checksums.txt and must be preserved alongside the archive.

Verified operational archive (from recent operator session):
- Archive path: artifacts/operational/20260331T023435Z
- Checksum file: artifacts/operational/20260331T023435Z-checksums.txt
- Archived deployed asset filenames (examples):
  - assets/index-BsqAJ34Y.css
  - assets/index-BtRHlc7J.js

Staging smoke verification (local preview, non-production):
- dist-staging root served successfully over local HTTP.
- Referenced assets discovered from root:
  - /assets/index-BQBo6zK2.css
  - /assets/index-DyiOv8K_.js
- Asset HTTP checks returned 200.
- Note: /does-not-exist returned 404 under python3 -m http.server; this is expected for a simple static server and is not a validation of SPA rewrite behavior.

How the artifact is restored (rollback) — operator-run, repo-scoped commands

Local preview (developer):

1. Build the frontend and copy the public output into the repo root dist/:

   PORT=5173 BASE_PATH=/ pnpm --filter @workspace/workforce-console run build
   rsync -av --delete artifacts/workforce-console/dist/public/ ./dist/

2. Start the Flask preview server that serves ./dist (or set FRONTEND_DIST_DIR):

   FRONTEND_DIST_DIR="$(pwd)/dist" python -m flask --app app run --host=0.0.0.0 --port=5000

Or use the provided helper script (recommended):

   ./scripts/preview_frontend.sh

Notes:
- Vite's config requires PORT and BASE_PATH to be set when building; the helper script sets sensible defaults.
- The script copies build output to ./dist and runs the local Flask wrapper (app.py) so SPA routing and static routes behave the same as production.

How the artifact is restored (rollback) — operator-run, repo-scoped commands
From the repository root (/home/hn3t/workforce_frontend_app):

scripts/restore_operational_artifact.sh "artifacts/operational/<timestamp>"

Or the equivalent manual rsync:

rsync -av --delete "artifacts/operational/<timestamp>/" dist/

Wrapper requirements
- The wrapper is a Flask static server at /home/hn3t/workforce_frontend_app/app.py.
  - It reads FRONTEND_DIST_DIR env var (absolute or relative). If unset, it serves ./dist in repo root.
  - It must run with a process supervisor (systemd, container, or platform) that ensures the wrapper is serving the dist directory and can be restarted after restores.
- File permissions: the wrapper process must be able to read files under dist/ (ensure ownership/permissions are appropriate for the runtime user).
- SPA routing: wrapper must return index.html for unknown routes (app.py implements this behavior).
- API expectations: client code uses same-origin "/api/..."; production must proxy /api to backend or run API on same origin.

Copy/deploy steps (how artifact lineage has been deployed historically)
- Observed historical command used to deploy the artifact into this repo:
  rsync -av --delete ~/repo_imports/Workforce-Showcase-master/artifacts/workforce-console/dist/public/ ~/workforce_frontend_app/dist/

Recommended safe deployment flow (documented and reversible):
1. Build/export artifact in build environment producing artifacts/workforce-console/dist/public (pnpm --filter @workspace/workforce-console run build).
2. Transfer artifact to deploy host or repo_imports area (or CI artifact store).
3. Create timestamped archive of the current deployed dist (see "How the artifact is archived" above).
4. Deploy the new artifact via rsync:
   rsync -av --delete /path/to/new/artifact/public/ /home/hn3t/workforce_frontend_app/dist/
5. Verify checksums and run staging smoke tests before promoting.

Archive location for the currently deployed artifact (naming convention)
- artifacts/operational/<timestamp>/  (example: artifacts/operational/20260331T022757Z/)
- checksum file: artifacts/operational/<timestamp>-checksums.txt

Restore script location and semantics
- Script path: scripts/restore_operational_artifact.sh
- Script behavior: accepts a single argument (archive directory relative to the repo), rsyncs contents into ./dist, and prints guidance for checksum verification. Example usage:
  scripts/restore_operational_artifact.sh "artifacts/operational/20260331T022757Z"
- The operator should make the script executable prior to use (chmod +x scripts/restore_operational_artifact.sh).

Exact rollback commands (documented)
- Restore using the script:
  scripts/restore_operational_artifact.sh "artifacts/operational/<timestamp>"

- Or the manual rsync command (equivalent):
  rsync -av --delete "artifacts/operational/<timestamp>/" dist/

Safety notes
- This README documents the operational canonical artifact lineage and provides explicit archive/restore commands scoped to this repository. No archive or restore commands were executed by the documentation update step.
- For any production operation, perform these steps in a maintenance window, notify on-call owners, and validate smoke tests and monitoring after any change.

Contact and provenance
- Provenance evidence collected locally and stored under docs/ADMIN/frontend/ARTIFACT_ARCHIVE/ and artifacts/operational/ when archives are created.
- If external authoritative provenance is required, request: Replit export logs or CI artifact upload records containing build/run id, build command, timestamp, and artifact checksums.
