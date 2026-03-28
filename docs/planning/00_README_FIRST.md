# Workforce Planning & Copilot Execution Pack

This package organizes the planning and execution framework we built for Workforce into reusable Markdown files plus a PDF reference guide.

## What this pack is for

Use this pack when you want a repeatable, Copilot-friendly way to:

- define a module before building it
- turn the module into a master-plan section
- split work into atomic, reviewable checkboxes
- execute one checkbox at a time with Copilot
- record progress consistently
- enforce tenancy, RBAC, safety, and scope discipline

## Recommended usage order

1. Read `MODULE_SPEC_TEMPLATE.md`
2. Read `MASTER_PLAN_FORMAT_STANDARD.md`
3. Read `PLAN_STATUS_VOCABULARY.md`
4. Read `RUN_PLAN_DECISION_RULES.md`
5. Read `COPILOT_EXECUTE_ATOMIC_TASK.md`
6. Use `PROGRESS_REPORT_TEMPLATE.md`
7. Use the Workforce Studio example files under `workforce_studio/`
8. Use the Copilot install prompt under `copilot_install/`

## Package structure

- `templates/` — reusable templates, standards, prompts, and executor rules
- `workforce_studio/` — concrete Workforce Studio example specs and plan sections
- `copilot_install/` — prompts and instructions for installing this setup into a repo
- `reference/` — packaged PDF reference guide

## Included core documents

### Templates and standards
- `templates/MODULE_SPEC_TEMPLATE.md`
- `templates/MASTER_PLAN_FORMAT_STANDARD.md`
- `templates/PLAN_STATUS_VOCABULARY.md`
- `templates/RUN_PLAN_DECISION_RULES.md`
- `templates/COPILOT_EXECUTE_ATOMIC_TASK.md`
- `templates/COPILOT_EXECUTION_WRAPPERS.md`
- `templates/PROGRESS_REPORT_TEMPLATE.md`
- `templates/PROGRESS_REPORT_TEMPLATE_SHORT.md`

### Workforce Studio example set
- `workforce_studio/WORKFORCE_STUDIO_IMPLEMENTATION_SPEC.md`
- `workforce_studio/WORKFORCE_STUDIO_COPILOT_HANDOFF.md`
- `workforce_studio/HN3T_MASTER_PLAN_WORKFORCE_STUDIO_BUILD_ORDER.md`
- `workforce_studio/HN3T_MASTER_PLAN_WORKFORCE_STUDIO_ATOMIC_EXECUTION_PLAN.md`

### Copilot install set
- `copilot_install/COPILOT_INSTALL_WORKFORCE_PLANNING_SETUP.md`
- `copilot_install/COPILOT_INSTALL_WORKFORCE_PLANNING_SETUP_PROMPT.md`

## Recommended repo placement

A good default placement is:

```text
docs/planning/
  README.md
  templates/
  workforce_studio/
  PROGRESS_REPORT_TEMPLATE.md
```

If you already have repo conventions for docs, keep the content but adapt the paths.

## Safety reminders

- Never weaken tenant isolation
- Never bypass RBAC
- Never let Studio mutate live operational Workforce data in v1
- Prefer one small patch per checkbox
- Add tests with each behavior change when appropriate
