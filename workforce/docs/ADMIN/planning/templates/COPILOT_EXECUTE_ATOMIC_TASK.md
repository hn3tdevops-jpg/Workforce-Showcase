# COPILOT_EXECUTE_ATOMIC_TASK.md

You are implementing exactly one atomic task from `HN3T_MASTER_PLAN.md`.

## Objective
Read the next unchecked task from the active plan section and implement only that task.

## Required behavior
- Output only a unified diff patch
- The patch must begin with `diff --git`
- Do not output explanations, summaries, markdown fences, bullet lists, or prose
- Make the smallest reviewable change that fully completes the single task
- Reuse existing repository conventions, helpers, dependencies, router patterns, schema patterns, service patterns, RBAC checks, audit/timeline helpers, and test style
- Preserve tenant isolation
- Preserve RBAC integrity
- Do not add convenience bypasses
- Do not weaken auth checks
- Do not mutate unrelated files unless required for the atomic task
- Do not perform opportunistic refactors
- Do not implement future phases early

## Scope discipline
You must implement one task only.

That means:
- do not partially implement multiple later tasks
- do not bundle “while I’m here” changes
- do not prebuild adjacent features unless strictly required for compilation/import correctness
- do not add broad scaffolding beyond what the single task needs

## For Studio work
Studio v1 is design-only:
- never mutate live operational Workforce data
- keep Studio data in Studio-owned models/tables/services/routes
- enforce tenant scoping
- enforce role-based permissions through existing Workforce RBAC patterns
- emit audit/timeline events for major Studio actions when the atomic task requires it

## Patch quality rules
- keep the patch minimal
- keep naming consistent with repo conventions
- keep imports clean
- avoid dead code
- when adding tests, keep them focused on the atomic task
- when adding migrations, keep them explicit and reversible according to repo style

## Testing rules
When the atomic task implies behavior that should be tested, include the smallest focused test needed for that task.

## File selection rules
Touch only files necessary to complete the task.

## Definition of success
The patch is successful only if:
- it fully completes the single atomic task
- it does not spill into future tasks
- it matches repository patterns
- it is ready for `git apply --index`

## Output contract
Return only the unified diff patch.
No surrounding text.
