# INSTALL_INTO_EXISTING_WORKFORCE_REPO__EXACT_CONVENTIONS.md

## Goal
Install the planning/execution framework into the current Workforce repo **without breaking existing conventions**.

## Assumed existing files
- `HN3T_MASTER_PLAN.md`
- `PROGRESS_REPORT.md` or a desire to create it
- `scripts/run_plan.sh`
- `.github/copilot-instructions.md`

## Recommended install sequence

### Step 1 — planning docs
Copy or merge the following into the repo:

- `docs/planning/templates/*`
- `docs/planning/workforce_studio/*`
- `docs/planning/reference/*`
- `docs/planning/copilot_install/*`

### Step 2 — root-level planning inserts
Use these files from `root_file_inserts/`:

- `MASTER_PLAN_FORMAT_STANDARD.md`
- `MODULE_SPEC_TEMPLATE.md`
- `PLAN_STATUS_VOCABULARY.md`
- `RUN_PLAN_DECISION_RULES.md`
- `COPILOT_EXECUTE_ATOMIC_TASK.md`
- `COPILOT_EXECUTION_WRAPPERS.md`
- `PROGRESS_REPORT_TEMPLATE.md`
- `PROGRESS_REPORT_TEMPLATE_SHORT.md`

### Step 3 — merge the Workforce Studio plan sections
Add the contents of:

- `root_file_inserts/HN3T_MASTER_PLAN__SECTION__WORKFORCE_STUDIO_V1__BUILD_ORDER.md`
- `root_file_inserts/HN3T_MASTER_PLAN__SECTION__WORKFORCE_STUDIO_V1__ATOMIC_EXECUTION_PLAN.md`

into `HN3T_MASTER_PLAN.md` as new sections.

### Step 4 — progress tracking
If `PROGRESS_REPORT.md` does not exist, create it from `root_file_inserts/PROGRESS_REPORT_TEMPLATE.md`.
If it already exists, merge the status vocabulary and atomic-task tracking structure into the current format instead of replacing the file wholesale.

### Step 5 — Copilot instructions
Append the contents of `.github/copilot-instructions-planning-appendix.md` into `.github/copilot-instructions.md` or merge the relevant sections manually.

### Step 6 — executor usage
Do not blindly rewrite `scripts/run_plan.sh` unless you want to. Instead, use `MERGE_PATCH_PLAN__scripts_run_plan.md` to align task selection, skip/block/retry behavior, and progress-file updates with the existing script flow.

## Best install mode
The safest install path is:
- keep the current repo files
- merge the framework into them
- preserve current script behavior
- add the new planning standards as a layer on top

## Avoid
- replacing `HN3T_MASTER_PLAN.md` entirely
- replacing `.github/copilot-instructions.md` entirely
- replacing `scripts/run_plan.sh` without reviewing the current execution behavior
- introducing a second conflicting planning system
