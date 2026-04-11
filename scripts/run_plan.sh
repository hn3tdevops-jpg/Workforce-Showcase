#!/usr/bin/env bash
set -euo pipefail

PLAN_FILE="${PLAN_FILE:-docs/plans/HN3T_MASTER_PLAN.md}"
STATE_FILE="${STATE_FILE:-.copilot_frontend/state.json}"
REPORT_FILE="${REPORT_FILE:-docs/ADMIN/frontend/PROGRESS_REPORT_FRONTEND.md}"
INSTR_FILE="${INSTR_FILE:-.github/copilot-instructions.md}"
LOG_DIR="${LOG_DIR:-.copilot_frontend/logs}"
CURRENT_PROMPT_FILE="${CURRENT_PROMPT_FILE:-.copilot_frontend/CURRENT_RUN_PROMPT.md}"

mkdir -p "$(dirname "$STATE_FILE")" "$LOG_DIR" "$(dirname "$CURRENT_PROMPT_FILE")"

ts="$(date -u +%Y%m%dT%H%M%SZ)"
prompt_file="$LOG_DIR/runplan-prompt-$ts.md"

cat > "$CURRENT_PROMPT_FILE" <<PROMPT
Use the repo plan and instructions below as the source of truth for this run.

Plan file:
$PLAN_FILE

Instructions file:
$INSTR_FILE

State file to update after meaningful progress:
$STATE_FILE

Progress report to update when project state changes:
$REPORT_FILE

Execution rules:
- Execute only the next smallest complete frontend-scoped task.
- Keep changes small and reviewable.
- Update the frontend state file and progress report when project state changes.
- Do not implement backend-only schema/API/RBAC changes in this repository.
- Output strict unified diff patches when asked to produce patches.
PROMPT

cp "$CURRENT_PROMPT_FILE" "$prompt_file"

copy_to_clipboard() {
  if command -v termux-clipboard-set >/dev/null 2>&1; then
    termux-clipboard-set < "$CURRENT_PROMPT_FILE"
    return 0
  elif command -v xclip >/dev/null 2>&1; then
    xclip -selection clipboard < "$CURRENT_PROMPT_FILE"
    return 0
  elif command -v xsel >/dev/null 2>&1; then
    xsel --clipboard --input < "$CURRENT_PROMPT_FILE"
    return 0
  elif command -v pbcopy >/dev/null 2>&1; then
    pbcopy < "$CURRENT_PROMPT_FILE"
    return 0
  fi
  return 1
}

echo "Current prompt: $CURRENT_PROMPT_FILE"
echo "Archived prompt: $prompt_file"
echo

if copy_to_clipboard; then
  echo "Prompt copied to clipboard."
  echo
fi

cat "$CURRENT_PROMPT_FILE"
echo
echo "Open Copilot in /home/hn3t/workforce_frontend_app and paste the prompt above."
