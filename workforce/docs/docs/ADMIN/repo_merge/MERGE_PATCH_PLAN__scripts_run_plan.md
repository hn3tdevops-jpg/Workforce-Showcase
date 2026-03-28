# MERGE_PATCH_PLAN__scripts_run_plan.md

## Purpose
Align the current `scripts/run_plan.sh` behavior with the planning framework without forcing a full script rewrite.

## Recommended source files
- `root_file_inserts/COPILOT_EXECUTE_ATOMIC_TASK.md`
- `root_file_inserts/COPILOT_EXECUTION_WRAPPERS.md`
- `root_file_inserts/RUN_PLAN_DECISION_RULES.md`
- `root_file_inserts/PLAN_STATUS_VOCABULARY.md`

## Recommended behavior changes
Your current script should ideally do the following:

1. read the next unchecked checkbox from the target plan section
2. verify whether it appears already complete
3. decide execute / skip / block using the decision rules
4. ask Copilot for exactly one atomic patch
5. reject output that is not a unified diff
6. apply the patch
7. run focused tests if appropriate
8. update `PROGRESS_REPORT.md`
9. stop after one checkbox

## You do not need to rewrite everything
If the current script already:
- finds the next unchecked task
- requests a diff-only patch
- applies patches
- appends progress

then it may only need prompt and status-handling updates, not a structural rewrite.

## Recommended merge strategy
Use the decision-rules and wrapper files as behavioral guidance for the current script rather than as hard replacement code.

## Key safety rule
Never let the script keep retrying indefinitely on a bad checkbox or malformed output.
