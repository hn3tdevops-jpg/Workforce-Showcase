# MASTER_PLAN_FORMAT_STANDARD.md

## Purpose
Standardize how new module sections are written in `HN3T_MASTER_PLAN.md` so they work cleanly with:

- human review
- Copilot handoff
- `run_plan.sh`
- `PROGRESS_REPORT.md`
- atomic patch execution
- audit-friendly implementation tracking

## 1. Required Section Structure

Every major plan section should follow this top-level structure:

```md
## [NUMBER]) [MODULE OR FEATURE NAME] — [PLAN TYPE]

### Goal
...

### Rules
...

### Scope
...

### Non-Goals
...

### Dependencies
...

### Phase 1 — ...
- [ ] ...
- [ ] ...

### Phase 2 — ...
- [ ] ...

### Definition of Done
- [ ] ...
```

For atomic executor sections, use:
`## [NUMBER]) [MODULE OR FEATURE NAME] — ATOMIC EXECUTION PLAN`

For higher-level phased sections, use:
`## [NUMBER]) [MODULE OR FEATURE NAME] — BUILD ORDER (Phases)`

## 2. Section Naming Rules

Use names that are:
- specific
- stable
- easy to search
- easy to quote in prompts

Good examples:
- `## 25) WORKFORCE STUDIO V1 — ATOMIC EXECUTION PLAN`
- `## 26) SHIFT MARKETPLACE — BUILD ORDER (Phases)`

## 3. Goal Block Standard

Every section must start with a short Goal block.

Format:
```md
### Goal
Build [module name] as a [brief definition] that [main outcome].
```

Keep this to 1–3 short sentences.

## 4. Rules Block Standard

Every section must include a Rules block listing non-negotiable implementation constraints.

Required universal rules for Workforce modules:
- Never weaken tenant isolation
- Never bypass RBAC
- Reuse existing repository patterns
- Prefer small, reviewable patches
- Add tests for behavior changes
- Avoid unrelated refactors during atomic work

Add module-specific rules where needed.

## 5. Scope Block Standard

Every section must define what the module owns.

Format:
```md
### Scope
Includes:
- ...
- ...

Excludes:
- ...
- ...
```

## 6. Non-Goals Block Standard

Every section should explicitly say what it will not do in the current phase.

## 7. Dependencies Block Standard

Every section should identify prerequisites before the phase list begins.

## 8. Phase Header Standard

Every build phase must follow:
`### Phase [N] — [clear phase name]`

## 9. Checkbox Wording Standard

Each checkbox must represent exactly one reviewable implementation unit.

Start with a strong verb:
- Add
- Create
- Implement
- Register
- Emit
- Persist
- Return
- Reject
- Validate
- Render

Avoid compound checkboxes. One checkbox should normally correspond to one logical patch target.

## 10. Atomic Granularity Rule

A checkbox is atomic only if it can usually be completed in:
- one focused patch
- one clear review
- one narrow test set

Usually atomic:
- one migration
- one model
- one schema
- one endpoint
- one service method
- one audit event
- one focused test

Usually not atomic:
- whole subsystem
- full CRUD stack in one checkbox
- backend + frontend + tests bundled together

## 11. Ordering Rule

Checkboxes inside a phase should be arranged in dependency order.

Preferred order:
1. enums/constants
2. migration
3. model
4. schema
5. repository
6. service
7. route
8. audit event
9. tests
10. frontend wiring

## 12. Endpoint Formatting Standard

Whenever a checkbox adds an API route, write it explicitly using method + path.

Examples:
- [ ] Implement `POST /studio/projects`
- [ ] Implement `GET /studio/projects/{project_id}`

## 13. Migration Formatting Standard

Migration tasks should always be separate from model tasks.

## 14. Testing Formatting Standard

Testing tasks should explicitly describe what is being verified.

Good examples:
- [ ] Add test rejecting invalid scope combinations for Studio project create
- [ ] Add test listing only accessible Studio projects

Avoid vague tasks like `Add tests`.

## 15. Audit/Event Formatting Standard

Audit/timeline work should be explicit.

Examples:
- [ ] Emit audit event for Studio project create
- [ ] Emit audit event for Studio validation run

## 16. Exit Criteria / Phase Completion Standard

Each major phased plan should include exit criteria at the end of each phase or at least the end of the section.

## 17. Definition of Done Standard

Every section must end with a Definition of Done block.

These criteria should define outcomes, not implementation trivia.

## 18. Recommended Internal-First Usage Block

For modules intended to be used internally before external rollout, include a short usage block describing where to prove value first.

## 19. Wording Rules

Use direct implementation language.

Prefer:
- Add
- Create
- Implement
- Register
- Persist
- Return
- Emit
- Render
- Validate
- Reject

Avoid:
- maybe add
- explore
- think about
- eventually do
- probably implement

## 20. Formatting Rules for `run_plan.sh`

To keep sections executor-friendly:
- use plain markdown checkboxes only
- keep one task per line
- do not nest checkboxes
- avoid long prose between checkboxes
- keep headings stable

## 21. Status Annotation Rule

Recommended approach:
- plan = plain checkboxes
- progress file = detailed status and outcome codes

## 22. Numbering Rule

Every major section should have a stable top-level number.

## 23. Module Template

A new module section should contain:
- Goal
- Rules
- Scope
- Non-Goals
- Dependencies
- Phased checklists
- Definition of Done
- Recommended Internal-First Usage

## 24. Review Checklist for New Plan Sections

Before adding a new section, verify:
- [ ] section title is stable and specific
- [ ] goal is short and clear
- [ ] rules are explicit
- [ ] scope and non-goals are defined
- [ ] dependencies are named
- [ ] phases are ordered by dependency
- [ ] every checkbox is atomic
- [ ] migration/model/schema/service/route/tests are separated
- [ ] endpoint paths are explicit
- [ ] definition of done is outcome-based

## 25. Workforce-Specific Hard Rule

Reject or rewrite any plan section that:
- mixes multiple modules without boundaries
- hides RBAC or tenant work inside vague language
- bundles backend, frontend, migrations, and tests into a single checkbox
- uses non-executable wording
