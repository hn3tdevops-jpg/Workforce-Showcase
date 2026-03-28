# MERGE_PATCH_PLAN__PROGRESS_REPORT.md

## Purpose
Align `PROGRESS_REPORT.md` with the new atomic execution workflow without disrupting current reporting habits.

## Recommended source files
- `root_file_inserts/PROGRESS_REPORT_TEMPLATE.md`
- `root_file_inserts/PROGRESS_REPORT_TEMPLATE_SHORT.md`
- `root_file_inserts/PLAN_STATUS_VOCABULARY.md`

## If `PROGRESS_REPORT.md` does not exist
Create it from `PROGRESS_REPORT_TEMPLATE.md`.

## If `PROGRESS_REPORT.md` already exists
Do not replace it wholesale unless it is still disposable or empty.
Instead merge in these capabilities:

### Required additions
- exact checkbox tracking
- plan state field
- outcome code field
- files touched
- tests run
- next recommended task
- blocker logging
- concise per-task entry structure

### Status language to standardize
Use:
- `TODO`
- `IN_PROGRESS`
- `COMPLETE`
- `BLOCKED`
- `SKIPPED`
- `SUPERSEDED`

And the executor outcome codes from `PLAN_STATUS_VOCABULARY.md`.

## Recommended merge method
1. preserve any existing historical entries
2. insert a new section for the Studio atomic workflow
3. add the standardized outcome-code field
4. keep the file short enough to remain usable during repeated runs

## Best-practice note
The progress file should hold detailed state. The plan file should remain mostly plain checkboxes.
