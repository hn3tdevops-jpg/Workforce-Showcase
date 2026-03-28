# scripts__run_plan__integration_notes.md

Use these notes when aligning `scripts/run_plan.sh` with the planning framework.

## Expected behavior
- read one unchecked checkbox
- request one unified diff patch
- reject malformed non-diff output
- use skip/block/retry rules
- update `PROGRESS_REPORT.md`
- stop after one checkbox

## Keep
- existing repo-specific patch application flow
- existing state/logging flow where it still works

## Add or improve
- exact checkbox targeting
- outcome code handling
- no infinite retry loops
- concise progress file updates
