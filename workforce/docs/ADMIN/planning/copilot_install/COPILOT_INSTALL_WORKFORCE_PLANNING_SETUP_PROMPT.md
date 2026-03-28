# COPILOT_INSTALL_WORKFORCE_PLANNING_SETUP_PROMPT.md

Use the following prompt with Copilot to install this planning framework into the repository.

```text
Install the Workforce planning and Copilot execution framework from the provided package into this repository.

Primary reference file:
- `COPILOT_INSTALL_WORKFORCE_PLANNING_SETUP.md`

Files to install:
- `00_README_FIRST.md`
- `templates/MODULE_SPEC_TEMPLATE.md`
- `templates/MASTER_PLAN_FORMAT_STANDARD.md`
- `templates/PLAN_STATUS_VOCABULARY.md`
- `templates/RUN_PLAN_DECISION_RULES.md`
- `templates/COPILOT_EXECUTE_ATOMIC_TASK.md`
- `templates/COPILOT_EXECUTION_WRAPPERS.md`
- `templates/PROGRESS_REPORT_TEMPLATE.md`
- `templates/PROGRESS_REPORT_TEMPLATE_SHORT.md`
- `workforce_studio/WORKFORCE_STUDIO_IMPLEMENTATION_SPEC.md`
- `workforce_studio/WORKFORCE_STUDIO_COPILOT_HANDOFF.md`
- `workforce_studio/HN3T_MASTER_PLAN_WORKFORCE_STUDIO_BUILD_ORDER.md`
- `workforce_studio/HN3T_MASTER_PLAN_WORKFORCE_STUDIO_ATOMIC_EXECUTION_PLAN.md`

Installation requirements:
- inspect existing repo conventions first
- install these files into a sensible docs/planning structure, or the nearest equivalent that matches the repo’s current patterns
- create `docs/planning/README.md` from the package overview
- update `copilot-instructions.md`, `AGENTS.md`, or equivalent guidance file so future Copilot sessions know these planning docs exist and how to use them
- do not overwrite existing master-plan content unnecessarily
- if `HN3T_MASTER_PLAN.md` already exists, append or reference the Workforce Studio section safely
- if `PROGRESS_REPORT.md` already exists, preserve useful history and only integrate the new template structure as needed
- preserve tenant isolation, RBAC assumptions, and design-only Studio boundaries
- keep the patch additive and reviewable
- output only a unified diff patch beginning with `diff --git`

Do not implement Workforce Studio itself in this task.
This task is only for installing the planning framework and its documentation into the repository.
```
