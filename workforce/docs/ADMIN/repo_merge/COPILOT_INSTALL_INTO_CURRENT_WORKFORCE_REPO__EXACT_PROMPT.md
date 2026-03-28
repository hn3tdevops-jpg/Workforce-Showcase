# COPILOT_INSTALL_INTO_CURRENT_WORKFORCE_REPO__EXACT_PROMPT.md

You are installing a planning and execution framework into the existing Workforce repo.

## Mission
Merge the planning framework contained in this pack into the current repository in a way that fits the repo’s existing conventions.

## Existing repo assumptions
The repo already uses or is intended to use:
- `HN3T_MASTER_PLAN.md`
- `PROGRESS_REPORT.md`
- `scripts/run_plan.sh`
- `.github/copilot-instructions.md`

## Install goals
1. Preserve current repository-specific coding/build/test guidance
2. Add the planning framework under `docs/planning/`
3. Add the Workforce Studio planning and implementation files
4. Merge the new Workforce Studio sections into `HN3T_MASTER_PLAN.md`
5. Merge or create `PROGRESS_REPORT.md` using the provided template and status vocabulary
6. Append the planning appendix into `.github/copilot-instructions.md`
7. Preserve tenant isolation, RBAC, and audit/timeline safety rules
8. Do not break the current `scripts/run_plan.sh` workflow

## Required behavior
- Reuse existing repository patterns
- Make additive, reviewable changes
- Do not replace core repo files wholesale unless they are missing or empty
- Do not delete current instructions or historical plan content
- Prefer appending or merging over replacement
- Keep build/test instructions intact
- Keep current auth and architecture rules intact

## Exact files to use from this pack

### Planning docs
- `docs/planning/templates/*`
- `docs/planning/workforce_studio/*`
- `docs/planning/reference/*`
- `docs/planning/copilot_install/*`

### Merge guidance
- `MERGE_PATCH_PLAN__OVERVIEW.md`
- `MERGE_PATCH_PLAN__HN3T_MASTER_PLAN.md`
- `MERGE_PATCH_PLAN__PROGRESS_REPORT.md`
- `MERGE_PATCH_PLAN__.github_copilot-instructions.md`
- `MERGE_PATCH_PLAN__scripts_run_plan.md`
- `INSTALL_INTO_EXISTING_WORKFORCE_REPO__EXACT_CONVENTIONS.md`

### Root inserts
- `root_file_inserts/*`

## Execution steps
1. Inspect current repo structure and confirm the target files exist or identify which are missing
2. Copy the `docs/planning/` tree into the repo
3. Merge the Workforce Studio build-order and atomic-execution sections into `HN3T_MASTER_PLAN.md`
4. Merge or create `PROGRESS_REPORT.md` using the provided templates and vocabulary
5. Append the planning appendix into `.github/copilot-instructions.md`
6. Leave `scripts/run_plan.sh` functionally intact unless only small safe adjustments are needed to align with one-task execution and progress updates
7. Output a small, reviewable unified diff patch only

## Hard constraints
- Do not erase existing repo-specific instructions
- Do not replace `HN3T_MASTER_PLAN.md` wholesale
- Do not replace `.github/copilot-instructions.md` wholesale
- Do not introduce a second conflicting planning system
- Do not weaken tenant isolation, RBAC, or audit safety conventions
- Do not mutate application code unrelated to installing the planning framework

## Output contract
Return only a unified diff patch beginning with `diff --git`
