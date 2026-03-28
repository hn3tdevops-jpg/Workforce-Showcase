# MERGE_PATCH_PLAN__OVERVIEW.md

## Purpose
This pack is the **exact-merge** version of the Workforce planning framework. It is tailored for a repo that already uses:

- `HN3T_MASTER_PLAN.md`
- `PROGRESS_REPORT.md`
- `scripts/run_plan.sh`
- `.github/copilot-instructions.md`

It is intended to be merged into the existing repo rather than adopted as a separate parallel planning system.

## What is new in this pack
Compared with the earlier repo-convention pack, this version adds:

- targeted merge plans for `HN3T_MASTER_PLAN.md`
- targeted merge plans for `PROGRESS_REPORT.md`
- targeted merge plans for `.github/copilot-instructions.md`
- `scripts/run_plan.sh` usage guidance
- exact insert-point recommendations
- a repo-specific reference PDF
- a stronger install prompt telling Copilot how to merge this safely into the current Workforce repo

## Merge strategy
Use the files in this order:

1. Read `INSTALL_INTO_EXISTING_WORKFORCE_REPO__EXACT_CONVENTIONS.md`
2. Review `MERGE_PATCH_PLAN__HN3T_MASTER_PLAN.md`
3. Review `MERGE_PATCH_PLAN__PROGRESS_REPORT.md`
4. Review `MERGE_PATCH_PLAN__.github_copilot-instructions.md`
5. Review `MERGE_PATCH_PLAN__scripts_run_plan.md`
6. Apply the `root_file_inserts/` files into the real repo
7. Use `COPILOT_INSTALL_INTO_CURRENT_WORKFORCE_REPO__EXACT_PROMPT.md` to have Copilot perform the merge

## Included merge targets
- `HN3T_MASTER_PLAN.md`
- `PROGRESS_REPORT.md`
- `.github/copilot-instructions.md`
- `scripts/run_plan.sh` usage pattern

## Important constraint
This framework is designed to **augment** the existing repo and workflow. It should not replace current tenancy, RBAC, audit, or execution conventions.
