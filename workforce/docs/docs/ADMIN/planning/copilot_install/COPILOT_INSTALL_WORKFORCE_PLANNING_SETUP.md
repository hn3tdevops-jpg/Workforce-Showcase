# COPILOT_INSTALL_WORKFORCE_PLANNING_SETUP.md

## Purpose
This file tells Copilot how to install the planning and execution framework from this package into an existing Workforce repository.

The goal is to make the repo self-documenting and execution-ready for:
- module specs
- master-plan sections
- atomic checkbox execution
- progress reporting
- decision-rule enforcement
- consistent status vocabulary

## Recommended target layout

```text
docs/
  planning/
    README.md
    templates/
      MODULE_SPEC_TEMPLATE.md
      MASTER_PLAN_FORMAT_STANDARD.md
      PLAN_STATUS_VOCABULARY.md
      RUN_PLAN_DECISION_RULES.md
      COPILOT_EXECUTE_ATOMIC_TASK.md
      COPILOT_EXECUTION_WRAPPERS.md
      PROGRESS_REPORT_TEMPLATE.md
      PROGRESS_REPORT_TEMPLATE_SHORT.md
    workforce_studio/
      WORKFORCE_STUDIO_IMPLEMENTATION_SPEC.md
      WORKFORCE_STUDIO_COPILOT_HANDOFF.md
      HN3T_MASTER_PLAN_WORKFORCE_STUDIO_BUILD_ORDER.md
      HN3T_MASTER_PLAN_WORKFORCE_STUDIO_ATOMIC_EXECUTION_PLAN.md
```

If the repository already uses another docs structure, preserve local conventions but keep file boundaries intact.

## Installation goals

Copilot should:

1. Create the target directories if missing.
2. Add the provided planning/template files with their contents preserved.
3. Add a `docs/planning/README.md` based on `00_README_FIRST.md`.
4. Ensure `HN3T_MASTER_PLAN.md` contains or links to the Workforce Studio section as appropriate.
5. Add or update `PROGRESS_REPORT.md` from the selected template if the repo workflow uses it.
6. Update repo guidance files such as `copilot-instructions.md`, `AGENTS.md`, or equivalent so future Copilot sessions know these files exist.
7. Keep all repo-specific path references consistent.

## Install steps Copilot should follow

### Step 1 — Inspect repo conventions
- find docs root
- find planning/master-plan files
- find Copilot guidance files
- find whether `PROGRESS_REPORT.md` already exists
- find whether `run_plan.sh` or equivalent executor exists

### Step 2 — Create planning directories
- create `docs/planning/`
- create `docs/planning/templates/`
- create `docs/planning/workforce_studio/`

### Step 3 — Add template files
Install:
- `MODULE_SPEC_TEMPLATE.md`
- `MASTER_PLAN_FORMAT_STANDARD.md`
- `PLAN_STATUS_VOCABULARY.md`
- `RUN_PLAN_DECISION_RULES.md`
- `COPILOT_EXECUTE_ATOMIC_TASK.md`
- `COPILOT_EXECUTION_WRAPPERS.md`
- `PROGRESS_REPORT_TEMPLATE.md`
- `PROGRESS_REPORT_TEMPLATE_SHORT.md`

### Step 4 — Add Workforce Studio example files
Install:
- `WORKFORCE_STUDIO_IMPLEMENTATION_SPEC.md`
- `WORKFORCE_STUDIO_COPILOT_HANDOFF.md`
- `HN3T_MASTER_PLAN_WORKFORCE_STUDIO_BUILD_ORDER.md`
- `HN3T_MASTER_PLAN_WORKFORCE_STUDIO_ATOMIC_EXECUTION_PLAN.md`

### Step 5 — Add package README
Create `docs/planning/README.md` with:
- package purpose
- file map
- recommended usage order
- safety reminders

### Step 6 — Wire repo guidance
Update `copilot-instructions.md`, `AGENTS.md`, or equivalent guidance file to mention:
- module specs should start from `docs/planning/templates/MODULE_SPEC_TEMPLATE.md`
- master-plan sections should follow `docs/planning/templates/MASTER_PLAN_FORMAT_STANDARD.md`
- atomic execution should follow `docs/planning/templates/COPILOT_EXECUTE_ATOMIC_TASK.md`
- progress reporting should use the progress template
- executor decisions should follow `RUN_PLAN_DECISION_RULES.md`
- status reporting should follow `PLAN_STATUS_VOCABULARY.md`

### Step 7 — Wire master plan usage
If the repo already has `HN3T_MASTER_PLAN.md`:
- either append the Workforce Studio section directly
- or add a pointer to the section file under `docs/planning/workforce_studio/`

Do not overwrite existing master-plan content unnecessarily.

### Step 8 — Wire progress-report usage
If the repo uses `PROGRESS_REPORT.md`:
- create or update it from the preferred template
- do not destroy useful existing history
- append or merge carefully

### Step 9 — Preserve repo safety
- do not weaken tenancy or RBAC assumptions
- do not mutate application logic just to install docs
- do not refactor unrelated code
- keep changes doc/config focused unless a guidance link requires a small code/config change

## Notes for Copilot

- Treat this install as a documentation and workflow bootstrap task, not a feature implementation task.
- Prefer additive, reviewable changes.
- Preserve existing repo conventions and paths where reasonable.
- Do not rewrite content just to “improve style” unless path updates are required.
- If a conflicting planning system already exists, install this framework beside it and clearly note the overlap rather than deleting prior process docs.
