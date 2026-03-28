# PLAN_STATUS_VOCABULARY.md

## Purpose
Standardize task and execution status language across:
- `HN3T_MASTER_PLAN.md`
- `PROGRESS_REPORT.md`
- executor logs
- `run_plan.sh` workflow notes
- Copilot execution summaries

## 1. Plan Checkbox States

### `TODO`
Task exists and has not been started.

### `IN_PROGRESS`
Task is actively being worked on, but not yet complete.

### `COMPLETE`
Task is fully implemented and accepted.

### `BLOCKED`
Task cannot proceed because of a dependency, ambiguity, external constraint, or repeated failure.

### `SKIPPED`
Task was intentionally not executed because it was already done, duplicated, or superseded.

### `SUPERSEDED`
Task is no longer the correct implementation target because a better or newer accepted path replaced it.

## 2. Executor Outcome Codes

### Success
- `COMPLETE`

### Skip outcomes
- `SKIPPED_ALREADY_DONE`
- `SKIPPED_DUPLICATE`
- `SKIPPED_SUPERSEDED`

### Blocked outcomes
- `BLOCKED_PREREQ`
- `BLOCKED_CONVENTION`
- `BLOCKED_EXTERNAL`
- `BLOCKED_NOT_ATOMIC`
- `BLOCKED_REPEATED_FAILURE`

### Stop / reject outcomes
- `STOP_SCOPE_CREEP`
- `STOP_SAFETY_RISK`
- `STOP_PATCH_TOO_LARGE`

### Retry outcomes
- `RETRY_FORMAT`
- `RETRY_APPLY`
- `RETRY_TEST_FIX`

## 3. Meaning of Each Executor Code

- `COMPLETE` — checkbox fully implemented and accepted
- `SKIPPED_ALREADY_DONE` — repo already satisfies the checkbox
- `SKIPPED_DUPLICATE` — checkbox duplicates another task
- `SKIPPED_SUPERSEDED` — checkbox no longer needed because another accepted implementation replaced it
- `BLOCKED_PREREQ` — required earlier dependency is missing
- `BLOCKED_CONVENTION` — task cannot be completed safely because repo convention or architecture is unclear
- `BLOCKED_EXTERNAL` — task depends on unavailable external resources or services
- `BLOCKED_NOT_ATOMIC` — task is too large or ambiguous to be one safe patch
- `BLOCKED_REPEATED_FAILURE` — task failed after allowed retries
- `STOP_SCOPE_CREEP` — proposed patch drifted beyond the requested checkbox
- `STOP_SAFETY_RISK` — proposed patch weakens tenant isolation, RBAC, or another non-negotiable boundary
- `STOP_PATCH_TOO_LARGE` — patch is too large to count as atomic
- `RETRY_FORMAT` — retry due to malformed patch output
- `RETRY_APPLY` — retry due to patch apply/context mismatch
- `RETRY_TEST_FIX` — one narrow retry to fix a test failure caused by the just-generated patch

## 4. Approved Status Usage by File

### In `HN3T_MASTER_PLAN.md`
Use human-readable states only:
- `TODO`
- `IN_PROGRESS`
- `COMPLETE`
- `BLOCKED`
- `SKIPPED`
- `SUPERSEDED`

### In `PROGRESS_REPORT.md`
Use both:
- Plan State
- Outcome Code

### In executor logs
Prefer strict executor outcome codes.

## 5. Mapping Rules

- `COMPLETE` -> `COMPLETE`
- `SKIPPED_ALREADY_DONE` -> `SKIPPED`
- `SKIPPED_DUPLICATE` -> `SKIPPED`
- `SKIPPED_SUPERSEDED` -> `SUPERSEDED`
- `BLOCKED_PREREQ` -> `BLOCKED`
- `BLOCKED_CONVENTION` -> `BLOCKED`
- `BLOCKED_EXTERNAL` -> `BLOCKED`
- `BLOCKED_NOT_ATOMIC` -> `BLOCKED`
- `BLOCKED_REPEATED_FAILURE` -> `BLOCKED`
- `STOP_SCOPE_CREEP` -> `BLOCKED`
- `STOP_SAFETY_RISK` -> `BLOCKED`
- `STOP_PATCH_TOO_LARGE` -> `BLOCKED`
- `RETRY_FORMAT` -> `IN_PROGRESS`
- `RETRY_APPLY` -> `IN_PROGRESS`
- `RETRY_TEST_FIX` -> `IN_PROGRESS`

## 6. Recommended Plan Annotation Style

Recommended option:
- keep the plan as plain checkboxes
- track detailed states in `PROGRESS_REPORT.md`

## 7. Recommended `PROGRESS_REPORT.md` Fields

For each processed task, record:
- exact checkbox text
- plan state
- outcome code
- timestamp
- files touched
- tests run
- short reason
- next action

## 8. Rules for Marking a Task `COMPLETE`

Mark complete only if:
- the exact checkbox intent is satisfied
- the patch is applied
- required tests were added or updated if appropriate
- no critical known issue remains for that checkbox

Do not mark complete when only placeholders or scaffolding exist.

## 9. Rules for Marking a Task `BLOCKED`

Mark blocked when:
- a required dependency is missing
- repo convention is unclear
- an external dependency is unavailable
- the task is too large to be atomic
- retries are exhausted

A blocked entry must include:
- why it is blocked
- what exact task or condition unblocks it
- what should happen next

## 10. Rules for Marking a Task `SKIPPED`

Mark skipped only when:
- it is already done
- it is truly duplicate
- it is superseded

Never silently skip a task.

## 11. Rules for `SUPERSEDED`

Use superseded when the intended outcome is still valid but the original checkbox is no longer the right implementation unit.

## 12. Recommended Short Vocabulary for Humans

Quick shorthand:
- todo
- doing
- done
- blocked
- skipped
- superseded

## 13. Studio-Specific Hard Rule

For Workforce Studio v1, automatically reject any patch as a blocking or safety outcome if it:
- mutates live operational Workforce data
- bypasses RBAC
- bypasses tenant filtering
- bundles future Studio phases into the current atomic checkbox
