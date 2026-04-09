Use the repo plan and instructions below as the source of truth for this run.

Plan file:
docs/plans/HN3T_MASTER_PLAN.md

Instructions file:
.github/copilot-instructions.md

State file to update after meaningful progress:
.copilot_frontend/state.json

Progress report to update when project state changes:
docs/ADMIN/frontend/PROGRESS_REPORT_FRONTEND.md

Execution rules:
- Execute only the next smallest complete frontend-scoped task.
- Keep changes small and reviewable.
- Update the frontend progress report and state file when project state changes.
- Do not implement backend-only schema/API/RBAC changes in this repository.
- Output strict unified diff patches when asked to produce patches.
