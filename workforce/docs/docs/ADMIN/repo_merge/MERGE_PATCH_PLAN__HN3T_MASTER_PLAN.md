# MERGE_PATCH_PLAN__HN3T_MASTER_PLAN.md

## Purpose
Merge the new Workforce Studio planning system into the existing `HN3T_MASTER_PLAN.md`.

## Exact source files
Use:
- `root_file_inserts/HN3T_MASTER_PLAN__SECTION__WORKFORCE_STUDIO_V1__BUILD_ORDER.md`
- `root_file_inserts/HN3T_MASTER_PLAN__SECTION__WORKFORCE_STUDIO_V1__ATOMIC_EXECUTION_PLAN.md`

## Recommended insertion point
Add these sections **after the current major plan sections** and preserve existing numbering style.

If your current plan already has numbered sections, renumber carefully and keep the number stable once inserted.

## Merge rules
- keep all existing module sections intact
- add the new sections as additional top-level sections
- do not collapse the build-order and atomic-execution versions into one section
- preserve checkbox formatting exactly
- do not convert the atomic plan into prose
- do not remove the current `## 24) BUILD ORDER (Phases)` conventions if they are already in use

## Why both sections should exist
- the **Build Order** section is better for human planning and phase review
- the **Atomic Execution Plan** section is better for `run_plan.sh` and one-checkbox execution

## Suggested final placement
1. existing master plan content
2. `WORKFORCE STUDIO V1 — BUILD ORDER (Phases)`
3. `WORKFORCE STUDIO V1 — ATOMIC EXECUTION PLAN`

## Post-merge check
After insertion, verify:
- headings are valid markdown headings
- checkboxes stayed on single lines
- numbering is consistent
- the Studio sections are easy to target by exact heading text
