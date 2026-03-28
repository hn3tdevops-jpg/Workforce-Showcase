# Workforce Planning & Copilot Execution Pack — Reference Guide

## Purpose
This guide explains what is in the package, why each file exists, how the files fit together, and how to install the set into a Workforce repository.

## Core idea
The package creates a repeatable workflow for:

1. defining a module
2. turning the module into a master-plan section
3. splitting the work into atomic execution tasks
4. executing one task at a time with Copilot
5. recording progress and outcomes consistently
6. enforcing tenancy, RBAC, and scope discipline

## Recommended usage order
1. `MODULE_SPEC_TEMPLATE.md`
2. `MASTER_PLAN_FORMAT_STANDARD.md`
3. `PLAN_STATUS_VOCABULARY.md`
4. `RUN_PLAN_DECISION_RULES.md`
5. `COPILOT_EXECUTE_ATOMIC_TASK.md`
6. `PROGRESS_REPORT_TEMPLATE.md`
7. Workforce Studio example files
8. Copilot install prompt files

## File groups

### Root
- `00_README_FIRST.md` — package overview, file map, recommended usage order
- `manifest.txt` — machine-readable list of included files

### Templates
- `MODULE_SPEC_TEMPLATE.md` — starting point for any new module
- `MASTER_PLAN_FORMAT_STANDARD.md` — standard for converting a module into a master-plan section
- `PLAN_STATUS_VOCABULARY.md` — normalized plan and executor statuses
- `RUN_PLAN_DECISION_RULES.md` — skip/block/retry/stop policy for atomic execution
- `COPILOT_EXECUTE_ATOMIC_TASK.md` — hard rules for one-checkbox execution
- `COPILOT_EXECUTION_WRAPPERS.md` — copyable wrapper prompts
- `PROGRESS_REPORT_TEMPLATE.md` — full progress-report template
- `PROGRESS_REPORT_TEMPLATE_SHORT.md` — shorter progress-report template

### Workforce Studio example set
- `WORKFORCE_STUDIO_IMPLEMENTATION_SPEC.md` — full implementation spec
- `WORKFORCE_STUDIO_COPILOT_HANDOFF.md` — Copilot-oriented build handoff
- `HN3T_MASTER_PLAN_WORKFORCE_STUDIO_BUILD_ORDER.md` — phased build-order section
- `HN3T_MASTER_PLAN_WORKFORCE_STUDIO_ATOMIC_EXECUTION_PLAN.md` — strict atomic execution section

### Copilot install set
- `COPILOT_INSTALL_WORKFORCE_PLANNING_SETUP.md` — install instructions for repo integration
- `COPILOT_INSTALL_WORKFORCE_PLANNING_SETUP_PROMPT.md` — ready-to-paste Copilot install prompt

## How the files fit together
The intended chain is:

`MODULE_SPEC_TEMPLATE.md`
-> `MASTER_PLAN_FORMAT_STANDARD.md`
-> a module-specific master-plan section
-> `COPILOT_EXECUTE_ATOMIC_TASK.md`
-> `RUN_PLAN_DECISION_RULES.md`
-> `PROGRESS_REPORT_TEMPLATE.md`
-> `PLAN_STATUS_VOCABULARY.md`

## Correct usage of each file

### `MODULE_SPEC_TEMPLATE.md`
Use this first whenever you are defining a new module or major feature. It is the design source document.

### `MASTER_PLAN_FORMAT_STANDARD.md`
Use this when turning a module spec into a buildable master-plan section. It enforces structure, wording, and checkbox granularity.

### `PLAN_STATUS_VOCABULARY.md`
Use this to keep plan state and execution state consistent across plan files, progress files, and executor logs.

### `RUN_PLAN_DECISION_RULES.md`
Use this when running an executor loop so skipped, blocked, retried, and stopped tasks are handled consistently.

### `COPILOT_EXECUTE_ATOMIC_TASK.md`
Use this as the hard instruction file for Copilot whenever you want exactly one checkbox implemented.

### `COPILOT_EXECUTION_WRAPPERS.md`
Use this for ready-made wrapper prompts: next-task execution, exact-checkbox execution, decision-rule enforcement, and progress updates.

### `PROGRESS_REPORT_TEMPLATE.md`
Use this when you want a full record of each task, file touched, test coverage, blockers, and next steps.

### `PROGRESS_REPORT_TEMPLATE_SHORT.md`
Use this when you want a much lighter executor-facing progress file.

### Workforce Studio files
Use these as a concrete example of how the system looks when applied to a real Workforce module.

### Copilot install files
Use these when you want Copilot to place the framework into a repo and wire the docs into the repo’s guidance files.

## Recommended repo install pattern
A good default is:

```text
docs/
  planning/
    README.md
    templates/
    workforce_studio/
```

## Install workflow
1. Inspect the repo’s current docs and Copilot guidance conventions.
2. Create the planning directories or map these files into the nearest equivalent.
3. Install the template files unchanged where possible.
4. Add the Workforce Studio example files.
5. Create or update the planning README.
6. Update Copilot guidance files to reference the new planning docs.
7. Integrate the master-plan section carefully instead of overwriting existing plan content.
8. Create or merge `PROGRESS_REPORT.md` without destroying useful history.

## Safety rules
- Never weaken tenant isolation.
- Never bypass RBAC.
- Never let Workforce Studio mutate live operational data in v1.
- Prefer additive, reviewable changes.
- Do not let an install task drift into a feature-implementation task.

## Best first internal uses
Use this framework internally first for:
- Hospitable Ops expansion
- property map
- shift marketplace
- timeline feature
- Restopeneur
- future CRM and automation modules
