# MODULE_SPEC_TEMPLATE.md

## Purpose
Use this template to define a module or major feature before converting it into an `HN3T_MASTER_PLAN.md` section.

This template is for:
- product definition
- architecture clarity
- scope control
- tenancy/RBAC planning
- API planning
- data model planning
- UI planning
- rollout planning

The module spec is the design source.
The master-plan section is the execution source.

# 1. Module Identity

## Module Name
[Module name]

## Version / Phase
[v1 / v2 / pilot / internal-only / etc.]

## Working Title
[Optional alternate/internal name]

## One-Line Description
[Short description of what the module is]

## Module Type
Choose one or more:
- Core platform module
- Operational module
- Configuration module
- Internal design/tooling module
- Tenant-facing module
- Admin-only module
- Integration module
- Reporting / analytics module
- Shared infrastructure module

# 2. Product Summary

## What this module does
[1–3 paragraphs]

## Why it exists
[What gap it fills]

## Main value
[Why it matters to Workforce]

## Who it is for
- [Primary user type]
- [Secondary user type]
- [Internal user type]
- [External/tenant user type]

# 3. Goals and Non-Goals

## Goals
- [Goal 1]
- [Goal 2]
- [Goal 3]

## Non-Goals
- [Not doing this in current phase]
- [Not replacing some other system]
- [Not mutating certain production state yet]
- [Not building advanced version yet]

# 4. Strategic Fit in Workforce

## Position in platform
[How it fits into Workforce overall]

## Related modules
- [Module A]
- [Module B]
- [Module C]

## Upstream inputs
- [What feeds into this module]

## Downstream outputs
- [What this module produces or influences]

## Internal-first or external-first
[Which rollout pattern is intended and why]

# 5. Ownership Boundaries

## This module owns
- [Owned object/process/domain]
- [Owned object/process/domain]

## This module may reference
- [Referenced shared object/domain]
- [Referenced shared object/domain]

## This module must not directly own or mutate
- [Protected operational object/domain]
- [Protected operational object/domain]

This section is mandatory.

# 6. Scope Model

## Tenant scope support
- Platform scope
- Business scope
- Location scope
- [Other scope if needed]

## Scope rules
- [Rule]
- [Rule]
- [Rule]

## Isolation requirements
- [No cross-business leakage]
- [No cross-location leakage]
- [Any special scope rule]

# 7. RBAC / Permission Model

## Permission keys
- `[permission.key]`
- `[permission.key]`
- `[permission.key]`

## Access rules
- [Who can read]
- [Who can create]
- [Who can update]
- [Who can approve/export/promote/etc.]

## Special restrictions
- [Special restriction]
- [Special restriction]

# 8. Core User Roles

## Primary actors
- [Actor]
- [Actor]
- [Actor]

## Role-specific behaviors
### [Role name]
- [Can do]
- [Cannot do]

### [Role name]
- [Can do]
- [Cannot do]

# 9. Core User Workflows

List the most important workflows.

## Workflow 1 — [Name]
1. [Step]
2. [Step]
3. [Step]

### Inputs
- [Input]

### Outputs
- [Output]

### Exceptions
- [Exception]

## Workflow 2 — [Name]
1. [Step]
2. [Step]
3. [Step]

### Inputs
- [Input]

### Outputs
- [Output]

### Exceptions
- [Exception]

Add as many as needed.

# 10. Domain Model

List the main objects the module needs.

## [Object Name]
### Purpose
[What it represents]

### Core fields
- `id`
- `[field]`
- `[field]`

### Relationships
- [Relationship]
- [Relationship]

### Notes
- [Constraint / lifecycle / ownership note]

Repeat for each major object.

# 11. Data Model / Persistence Draft

## Tables / models needed
- `[table_or_model_name]`
- `[table_or_model_name]`
- `[table_or_model_name]`

## Required enums
- `[enum_name]`
- `[enum_name]`

## Key constraints
- [Constraint]
- [Constraint]

## Indexing / performance notes
- [Note]
- [Note]

# 12. API Surface Draft

## Core endpoints
- `POST /...`
- `GET /...`
- `PATCH /...`
- `DELETE /...`

## Read models
- `GET /...`
- `GET /...`

## Actions / commands
- `POST /.../approve`
- `POST /.../export`
- `POST /.../validate`

## Notes
- [Auth note]
- [Scope note]
- [Validation note]

# 13. Service Layer Responsibilities

## Services expected
- `[service_name]`
- `[service_name]`
- `[service_name]`

## Responsibility split
### `[service_name]`
- [Responsibility]
- [Responsibility]

### `[service_name]`
- [Responsibility]
- [Responsibility]

# 14. Audit / Timeline / Event Requirements

## Required event keys
- `[event.key]`
- `[event.key]`
- `[event.key]`

## Event payload expectations
- [What should be recorded]

## Compliance / traceability notes
- [Note]

# 15. Validation Rules

## Validation categories
- data integrity
- workflow integrity
- permission integrity
- UI/view integrity
- cross-object consistency

## Example validation rules
- [Rule]
- [Rule]
- [Rule]

## Severity levels
- INFO
- WARNING
- HIGH
- BLOCKING

# 16. Artifact / Output Requirements

If the module generates output artifacts, define them here.

## Artifact types
- [Artifact]
- [Artifact]
- [Artifact]

## Output formats
- markdown
- json
- pdf
- [other]

## Generation rules
- [Rule]
- [Rule]

If not applicable, say so explicitly.

# 17. UI / Frontend Specification

## Main pages / surfaces
- [Page or workspace]
- [Page or workspace]

## Layout expectations
- [Layout note]
- [Layout note]

## Key components
- [Component]
- [Component]
- [Component]

## Important UX behaviors
- [Behavior]
- [Behavior]

## Empty/loading/error states
- [State requirement]

# 18. Integration Requirements

## Existing Workforce systems used
- [System]
- [System]

## External integrations
- [Integration]
- [Integration]

## Shared contracts to reuse
- [Shared contract]
- [Shared contract]

## Promotion / configuration bridge
[If this module later promotes into live config, explain how]

# 19. Operational Constraints

## Safety constraints
- [Constraint]
- [Constraint]

## Performance constraints
- [Constraint]
- [Constraint]

## Deployment / migration concerns
- [Concern]
- [Concern]

## Backward compatibility notes
- [Note]

# 20. Rollout Plan

## Phase 1
[What v1 includes]

## Phase 2
[What v2 adds]

## Phase 3
[What later phases add]

## Internal-first rollout recommendation
[How to prove value safely]

# 21. Acceptance Criteria

A module spec is only useful if it ends with clear success conditions.

## Acceptance criteria
- [Outcome]
- [Outcome]
- [Outcome]
- [Outcome]

These should be outcome-based, not implementation-trivial.

# 22. Risks / Open Questions

## Known risks
- [Risk]
- [Risk]

## Open questions
- [Question]
- [Question]

## Blocking questions
- [Blocking item]

# 23. Recommended Build Order

Convert the module into execution phases in this rough order:

1. [foundation]
2. [persistence]
3. [services]
4. [routes]
5. [validation]
6. [artifacts]
7. [frontend]
8. [promotion/integration]

This section should make it easy to derive the `HN3T_MASTER_PLAN.md` section later.

# 24. Copilot Handoff Notes

## Copilot implementation rules
- Reuse repository patterns
- Preserve tenant isolation
- Preserve RBAC integrity
- Prefer small reviewable patches
- Add focused tests
- Avoid opportunistic refactors

## Special module rules
- [Rule]
- [Rule]

## First recommended atomic task
- [First task]

# 25. Conversion Checklist

Before converting this spec into a master-plan section, verify:

- [ ] module identity is clear
- [ ] goals and non-goals are explicit
- [ ] ownership boundaries are defined
- [ ] scope and RBAC rules are defined
- [ ] domain model is outlined
- [ ] API surface is outlined
- [ ] validation rules are identified
- [ ] UI surfaces are identified
- [ ] rollout plan exists
- [ ] acceptance criteria are outcome-based
- [ ] risks and open questions are listed
- [ ] build order is clear enough to split into atomic checkboxes
