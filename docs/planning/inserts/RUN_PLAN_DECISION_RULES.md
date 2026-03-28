# RUN_PLAN_DECISION_RULES.md

## Purpose
Define consistent executor behavior for `run_plan.sh` when handling atomic tasks from `HN3T_MASTER_PLAN.md`.

The executor must decide whether the current checkbox should be:
- executed now
- skipped
- marked blocked
- retried
- stopped for manual review

## Core Rule
Each run should target exactly one unchecked checkbox unless the selected task is explicitly skipped, blocked, or retried under these rules.

## 1. Execute Now

Execute the task immediately when all of the following are true:
- the checkbox is unchecked
- the task is clearly scoped
- required prerequisite tasks appear complete
- the task can be implemented as a small reviewable patch
- the task does not require unavailable external credentials or ambiguous repo-wide design choices

## 2. Auto-Skip Rules

Skip the selected checkbox and move to the next unchecked one only if one of these conditions is true.

### 2.1 Already completed in repo
Skip if the exact task is already satisfied in the current codebase.

Required action:
- record the checkbox as `SKIPPED_ALREADY_DONE`
- add a concise note to `PROGRESS_REPORT.md`
- do not generate a no-op patch

### 2.2 Duplicate task wording
Skip if the checkbox duplicates an earlier completed checkbox or is clearly redundant.

### 2.3 Superseded by an accepted implementation
Skip if the task is no longer needed because the codebase already satisfies it through a different accepted implementation pattern.

## 3. Blocked Rules

### 3.1 Missing prerequisite
Block if the task depends on a missing earlier task not yet implemented.

Examples:
- route depends on model not yet created
- validation task depends on table/model absent from schema

Required action:
- record as `BLOCKED_PREREQ`
- identify the missing prerequisite checkbox

### 3.2 Missing repository convention or unresolved architecture choice
Block if the task cannot be implemented safely because the repo has no clear pattern and choosing one would be a design decision, not an atomic implementation.

Required action:
- record as `BLOCKED_CONVENTION`
- include the exact ambiguity in `PROGRESS_REPORT.md`

### 3.3 External dependency unavailable
Block if task requires something unavailable in the current environment.

### 3.4 Task is not atomic in practice
Block if the checkbox appears atomic in wording but actually requires a large multi-file architectural change that should be decomposed first.

Required action:
- record as `BLOCKED_NOT_ATOMIC`
- propose a smaller decomposition in `PROGRESS_REPORT.md`

## 4. Retry Rules

### 4.1 Patch formatting failure
Retry if Copilot output failed only because the patch format was invalid.

Allowed retries:
- maximum 2 retries for formatting-only failures

### 4.2 Patch apply failure with likely trivial cause
Retry if patch failed to apply due to small context drift, but the task is still valid and narrow.

Allowed retries:
- maximum 2 retries

### 4.3 Test failure clearly caused by the new patch and likely easy to fix
Retry once if the task patch is basically correct but needs a small follow-up correction within the same atomic boundary.

Allowed retries:
- maximum 1 corrective retry

## 5. Stop Rules

### 5.1 Scope creep detected
Stop if generated patch starts implementing neighboring checkboxes or future phases.

### 5.2 Tenant or RBAC safety risk
Stop if the proposed patch weakens tenant isolation, skips permission checks, adds bypasses, or introduces unsafe access patterns.

### 5.3 Patch is too large for atomic review
Stop if the patch is technically on-task but too large to count as a reviewable atomic change.

### 5.4 Repeated failure
Stop if the same checkbox fails after allowed retries.

## 6. Executor Status Codes

### Success
- `COMPLETE`

### Skip
- `SKIPPED_ALREADY_DONE`
- `SKIPPED_DUPLICATE`
- `SKIPPED_SUPERSEDED`

### Blocked
- `BLOCKED_PREREQ`
- `BLOCKED_CONVENTION`
- `BLOCKED_EXTERNAL`
- `BLOCKED_NOT_ATOMIC`
- `BLOCKED_REPEATED_FAILURE`

### Stop / reject
- `STOP_SCOPE_CREEP`
- `STOP_SAFETY_RISK`
- `STOP_PATCH_TOO_LARGE`

### Retry
- `RETRY_FORMAT`
- `RETRY_APPLY`
- `RETRY_TEST_FIX`

## 7. Recommended Retry Limits

- format retry limit: `2`
- apply retry limit: `2`
- test-fix retry limit: `1`
- total attempts per checkbox in one executor run: `3`

## 8. Required Progress Report Fields Per Outcome

For every processed checkbox, record:
- exact checkbox text
- status code
- timestamp
- files touched, if any
- tests run, if any
- short reason
- next recommended action

## 9. Suggested Executor Flow

1. read next unchecked checkbox
2. inspect whether already done
3. inspect obvious prerequisites
4. decide: execute / skip / block
5. if execute, request atomic patch
6. verify patch format
7. apply patch
8. run targeted tests if appropriate
9. decide: complete / retry / stop / block
10. update `PROGRESS_REPORT.md`
11. move to next run

## 10. Minimal Decision Matrix

- already done -> `SKIPPED_ALREADY_DONE`
- prerequisite missing -> `BLOCKED_PREREQ`
- patch format bad -> `RETRY_FORMAT`
- patch applies and tests pass -> `COMPLETE`
- patch expands scope -> `STOP_SCOPE_CREEP`
- patch weakens safety -> `STOP_SAFETY_RISK`
- repeated failures -> `BLOCKED_REPEATED_FAILURE`

## 11. Strict Rule for Studio Tasks

For Workforce Studio v1 specifically, always reject a patch if it:
- mutates live operational Workforce data
- bypasses RBAC
- bypasses tenant scope checks
- introduces broad scaffolding for future Studio phases not required by the checkbox
- silently combines backend and frontend tasks when only one was requested
