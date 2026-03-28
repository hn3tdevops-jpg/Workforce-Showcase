# COPILOT_EXECUTION_WRAPPERS.md

## Generic next-task wrapper

```text
Implement the next unchecked task from `HN3T_MASTER_PLAN.md` under the section `## 25) WORKFORCE STUDIO V1 — ATOMIC EXECUTION PLAN`.

Follow `COPILOT_EXECUTE_ATOMIC_TASK.md` exactly.

Additional execution rules for this run:
- Complete exactly one unchecked checkbox
- Output only a unified diff patch beginning with `diff --git`
- Do not include explanations
- Update `PROGRESS_REPORT.md` only if the repository already uses it in the current execution flow; otherwise do not touch it
- Prefer the smallest possible patch that fully satisfies the selected checkbox
```

## Exact-checkbox wrapper

```text
Implement this exact atomic task from `HN3T_MASTER_PLAN.md`:

[PASTE EXACT CHECKBOX TEXT HERE]

Follow `COPILOT_EXECUTE_ATOMIC_TASK.md` exactly.

Hard constraints:
- Complete only this task
- Output only a unified diff patch beginning with `diff --git`
- Do not implement neighboring tasks
- Do not include explanations
- Add or update tests only when necessary for this exact task
```

## Workforce Studio-targeted wrapper

```text
Implement this exact atomic task from `HN3T_MASTER_PLAN.md` for Workforce Studio v1:

[PASTE EXACT CHECKBOX TEXT HERE]

Requirements:
- Reuse existing Workforce repo patterns
- Preserve tenant isolation
- Preserve RBAC integrity
- Keep Studio design-only in v1
- Do not mutate live operational Workforce data
- Emit audit/timeline events only when this exact task requires them
- Keep the patch minimal and reviewable

Output only a unified diff patch starting with `diff --git`.
```

## Decision-rules wrapper

```text
Before implementing the selected checkbox, apply the rules in `RUN_PLAN_DECISION_RULES.md`.

Behavior requirements:
- if the task is already done, skip it and record the skip reason
- if the task is blocked by a missing prerequisite, record it as blocked
- if the patch output is malformed, retry only within the allowed retry limits
- if the patch introduces scope creep, reject it
- if the patch weakens tenant isolation, RBAC, or Studio’s design-only boundary, reject it immediately
- update `PROGRESS_REPORT.md` with the final status code for the checkbox
- never loop indefinitely on the same checkbox
```

## Progress-update wrapper

```text
After completing the atomic task patch, append a concise entry to `PROGRESS_REPORT.md` using the existing template in the repository.

Rules for the progress update:
- update only the sections relevant to the single completed task
- keep the entry concise and factual
- include the exact checkbox text
- include files touched
- include tests added or run
- include blocker notes only if applicable
- do not rewrite the whole file if a small append/update is enough
- if `PROGRESS_REPORT.md` does not exist, create it from the repository template and then add the entry
```
