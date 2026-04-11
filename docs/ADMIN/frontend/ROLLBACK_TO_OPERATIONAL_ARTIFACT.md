Rollback Procedure — Restore Operational Artifact

Purpose
- Restore the archived operational frontend artifact to /home/hn3t/workforce_frontend_app/dist in case a canonical build cutover fails.
- Provide exact, scripted steps, safety checks, verification commands, and failure criteria.

Important paths
- Deployed dist (live): /home/hn3t/workforce_frontend_app/dist
- Archived operational artifact (source of truth): /home/hn3t/workforce_frontend_app/docs/ADMIN/frontend/ARTIFACT_ARCHIVE/workforce-console-archive/
- Checksums file: /home/hn3t/workforce_frontend_app/docs/ADMIN/frontend/ARTIFACT_ARCHIVE/checksums-archive.txt
- Wrapper: /home/hn3t/workforce_frontend_app/app.py (Flask static server)
- Rollback script: /home/hn3t/workforce_frontend_app/scripts/restore_operational_artifact.sh

Pre-restore safety checks (do these before running the restore script)
1. Confirm archive exists and is readable:
   ls -l /home/hn3t/workforce_frontend_app/docs/ADMIN/frontend/ARTIFACT_ARCHIVE/workforce-console-archive/
2. Confirm recorded checksums exist:
   cat /home/hn3t/workforce_frontend_app/docs/ADMIN/frontend/ARTIFACT_ARCHIVE/checksums-archive.txt
3. Verify free disk space sufficient to copy archive into dist:
   df -h /home/hn3t/workforce_frontend_app | awk 'NR==2{print $4}'
4. Notify stakeholders and open maintenance window before proceeding.

Restore steps (scripted)
- Use the provided script to perform a safe restore (dry-run available via --dry-run flag):
  sudo bash /home/hn3t/workforce_frontend_app/scripts/restore_operational_artifact.sh [--dry-run]

What the script does (high level)
1. Verifies the archive directory and checksums file exist.
2. Optionally performs a dry-run rsync to preview changes.
3. Runs rsync --archive --verbose --delete to copy archive contents into the live dist directory.
4. Computes and compares checksums of restored assets vs the archived checksums file.
5. Prints next steps to restart the wrapper and run post-restore verification commands.

Post-restore verification (run immediately after script completes)
1. Verify checksums match:
   sha256sum /home/hn3t/workforce_frontend_app/dist/assets/*
   Compare output to /home/hn3t/workforce_frontend_app/docs/ADMIN/frontend/ARTIFACT_ARCHIVE/checksums-archive.txt
2. Quick HTTP checks (run from a machine that can reach the server):
   curl -fsS -o /dev/null -w "%{http_code}" http://localhost:8000/  # expect 200 (adjust host/port if different)
   curl -fsS -I http://localhost:8000/assets/index-*.js | head -n 1  # expect HTTP/1.1 200 OK or similar
3. API health check:
   curl -fsS http://localhost:8000/api/health  # expect 200 and JSON {"status":"ok"} (adjust endpoint)
4. Basic E2E smoke (manual/automated): log in as demo user and confirm key flows.

Failure criteria and rollback of rollback
- If checksums do not match the archive checksums, DO NOT consider the restore successful. Do not route traffic to the restored host.
- If HTTP checks fail or critical flows break, restore the backup created before the canonical cutover (if present) or contact operators. Keep artifacts and logs for post-mortem.

Logging and evidence collection
- Save rsync output to a timestamped log: /var/log/frontend_restore_<timestamp>.log (script writes to stdout; operator should redirect), and collect checksum outputs.
- If problem persists, archive /home/hn3t/workforce_frontend_app/dist/<failed_timestamp>/ for forensic analysis before attempting another restore.

Notes
- The script and commands intentionally do not restart services automatically; operator must restart the wrapper service or container as appropriate for the deployment environment.
- Replace localhost:8000 with the correct host/port or use an appropriate readiness probe for remote checks.

