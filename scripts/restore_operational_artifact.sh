#!/usr/bin/env bash
# scripts/restore_operational_artifact.sh
# Safe, repo-relative helper to restore an archived frontend artifact into ./dist
# Usage: scripts/restore_operational_artifact.sh [--dry-run] <archive_dir>
# If safety checks fail, defaults to dry-run mode.

set -euo pipefail
IFS=$'\n\t'

progname="$(basename "$0")"
repo_root="$(pwd)"
required_marker="package.json"  # simple heuristic to verify repo root

dry_run=0
ARCHIVE_DIR=""

print_usage() {
  cat <<EOF
Usage: $progname [--dry-run] <archive_dir>

Restore a repo-local archived frontend artifact into the repository's dist/ directory.
- archive_dir must be a path relative to the repo root (e.g. artifacts/operational/20260331T023435Z)
- If safety checks fail or --dry-run is provided, a dry-run rsync is performed and no changes are made.

Examples:
  $progname artifacts/operational/20260331T023435Z
  $progname --dry-run artifacts/operational/20260331T023435Z

EOF
}

# Parse args
if [ "$#" -eq 0 ]; then
  echo "ERROR: missing archive_dir argument." >&2
  print_usage
  echo "Defaulting to dry-run mode due to missing arguments." >&2
  dry_run=1
else
  if [ "$1" = "--dry-run" ]; then
    dry_run=1
    shift || true
  fi
  if [ "$#" -ge 1 ]; then
    ARCHIVE_DIR="$1"
  fi
fi

# Normalize archive path to repo-relative (do not allow absolute paths outside repo)
if [ -n "$ARCHIVE_DIR" ]; then
  # refuse absolute paths that are not inside repo
  case "$ARCHIVE_DIR" in
    /*)
      # If absolute, ensure it starts with repo_root
      case "$ARCHIVE_DIR" in
        "$repo_root"/*) ;;
        *)
          echo "ERROR: absolute archive_dir must be inside repo root: $repo_root" >&2
          echo "Defaulting to dry-run mode." >&2
          dry_run=1
          ;;
      esac
      ;;
    *)
      # relative path; prefix with repo root for internal checks
      ARCHIVE_DIR="$repo_root/$ARCHIVE_DIR"
      ;;
  esac
fi

# Basic repo root verification
if [ ! -f "$repo_root/$required_marker" ]; then
  echo "ERROR: could not find $required_marker in current directory ($repo_root). Are you in the repository root?" >&2
  echo "Defaulting to dry-run mode." >&2
  dry_run=1
fi

# Required paths
DIST_DIR="$repo_root/dist"
if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: target dist directory does not exist: $DIST_DIR" >&2
  echo "Create it (or run a build) before attempting a restore. Defaulting to dry-run mode." >&2
  dry_run=1
fi

# Archive presence checks
if [ -z "$ARCHIVE_DIR" ]; then
  echo "ERROR: no archive directory provided." >&2
  dry_run=1
else
  if [ ! -d "$ARCHIVE_DIR" ]; then
    echo "ERROR: archive directory not found or not a directory: $ARCHIVE_DIR" >&2
    dry_run=1
  fi
fi

# Quick content sanity check for expected frontend files
archive_has_index=0
archive_has_assets=0
if [ -n "$ARCHIVE_DIR" ] && [ -d "$ARCHIVE_DIR" ]; then
  if [ -f "$ARCHIVE_DIR/index.html" ]; then archive_has_index=1; fi
  if [ -d "$ARCHIVE_DIR/assets" ]; then archive_has_assets=1; fi
fi
if [ "$archive_has_index" -eq 0 ] && [ "$archive_has_assets" -eq 0 ]; then
  echo "WARNING: archive does not contain index.html or assets/ directory. Archive may not be a built frontend artifact." >&2
  echo "Defaulting to dry-run mode." >&2
  dry_run=1
fi

# Safety: ensure archive is not the same as dist (avoid destructive self-copy)
if [ "$ARCHIVE_DIR" = "$DIST_DIR" ] || [ "$ARCHIVE_DIR" = "$DIST_DIR/" ]; then
  echo "ERROR: archive directory is the same as dist/ - refusing to copy." >&2
  dry_run=1
fi

# Prepare rsync options
RSYNC_OPTS=(--archive --verbose --delete)
if [ "$dry_run" -eq 1 ]; then
  RSYNC_OPTS+=(--dry-run)
fi

# Show pre-validation summary
cat <<EOF
== Restore operational artifact - preflight ==
Repo root: $repo_root
Archive dir: ${ARCHIVE_DIR:-<none>}
Target dist: $DIST_DIR
Dry-run: ${dry_run:-0}

Pre-restore checks performed:
- repo root marker: $required_marker
- dist exists: $( [ -d "$DIST_DIR" ] && echo OK || echo MISSING )
- archive exists: $( [ -n "$ARCHIVE_DIR" -a -d "$ARCHIVE_DIR" ] && echo OK || echo MISSING )
- archive contains index.html: $( [ "$archive_has_index" -eq 1 ] && echo YES || echo NO )
- archive contains assets/: $( [ "$archive_has_assets" -eq 1 ] && echo YES || echo NO )

If any of the above say MISSING or NO, the script defaults to dry-run mode and will not modify dist/.

== Preview of rsync operation ==

"rsync ${RSYNC_OPTS[*]} "$ARCHIVE_DIR/" "$DIST_DIR/""

EOF

# Run rsync
if [ -n "$ARCHIVE_DIR" ] && [ -d "$ARCHIVE_DIR" ]; then
  if rsync "${RSYNC_OPTS[@]}" "$ARCHIVE_DIR/" "$DIST_DIR/"; then
    echo "\nrsync completed (see above for details)."
  else
    echo "ERROR: rsync failed." >&2
    exit 2
  fi
else
  echo "No valid archive to rsync; exiting." >&2
  exit 1
fi

# Post-restore guidance
cat <<EOF

== Post-restore validation steps (operator) ==
1) If a checksums file exists alongside the archive, compare restored files:
   find "$DIST_DIR" -type f -print0 | xargs -0 sha256sum > /tmp/restored-checksums.txt
   # Compare /path/to/<archive>-checksums.txt with /tmp/restored-checksums.txt

2) Restart or reload the static wrapper (systemd/container) that serves dist/ so it picks up changes.
   Example: sudo systemctl restart frontend-static.service  # replace with your service

3) Run quick HTTP and API checks from a machine that can reach the server:
   curl -fsS -o /dev/null -w "%{http_code}" http://localhost:8000/  # expect 200
   curl -fsS -I http://localhost:8000/assets/index-*.js | head -n 1

4) If checksums or HTTP checks fail, do NOT declare the restore successful. Preserve logs and artifacts.

== Notes ==
- This script intentionally avoids restarting services automatically. The operator must perform any service reloads.
- The script defaults to dry-run mode whenever safety checks do not pass. This is intentional to avoid accidental overwrites.

EOF
