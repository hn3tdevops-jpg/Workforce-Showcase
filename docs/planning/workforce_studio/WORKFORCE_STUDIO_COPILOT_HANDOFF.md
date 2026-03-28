# WORKFORCE_STUDIO_COPILOT_HANDOFF.md

## Mission
Build Workforce Studio as a new Workforce module that provides an AI-assisted design workspace for brainstorming, structuring, modeling, validating, visualizing, and exporting new module and workflow blueprints.

Studio v1 is design-only. It must not directly mutate live production operational state.

## Non-Negotiable Rules
1. Never weaken tenant isolation.
2. Never bypass RBAC.
3. Never let Studio mutate live operational data in v1.
4. Always emit audit/timeline events for major actions.
5. Keep design data in Studio-owned tables/models.
6. Prefer structured data over loose text.
7. Keep generated status explicit: confirmed, inferred, suggested, unresolved.
8. Prefer small, reviewable patches.
9. Add tests for every permission boundary and scope rule.
10. Do not invent a parallel auth model.

## Product Definition

### Module Name
Workforce Studio

### One-Line Description
AI-assisted project, workflow, and module design workspace for Workforce.

### V1 Outcome
A user can create a Studio project, brainstorm in chat, see extracted structured outputs, review derived workflows/entities, run validation, and export a design pack.

### V1 Explicitly Excludes
- live mutation of schedules, tasks, units, inspections, issues, tickets, orders, or menus
- automatic promotion into production config
- full manual visual editor
- uncontrolled AI writes to operational modules

## Scope Model

### Scope Types
- `PLATFORM`
- `BUSINESS`
- `LOCATION`

### Rules
- `BUSINESS` scope requires `business_id`
- `LOCATION` scope requires `business_id` and `location_id`
- project access must be filtered by tenant scope and role permissions
- no cross-business access
- no cross-location access unless role scope allows it

## Permissions

Add these permission keys to the central registry:
- `studio.projects.read`
- `studio.projects.create`
- `studio.projects.update`
- `studio.projects.delete`
- `studio.sessions.create`
- `studio.messages.create`
- `studio.notes.read`
- `studio.notes.write`
- `studio.requirements.read`
- `studio.requirements.write`
- `studio.models.read`
- `studio.models.write`
- `studio.validation.run`
- `studio.artifacts.generate`
- `studio.artifacts.read`
- `studio.artifacts.export`
- `studio.promotions.create`
- `studio.promotions.approve`

## Audit / Timeline Events

Suggested keys:
- `studio.project.create`
- `studio.project.update`
- `studio.project.archive`
- `studio.session.create`
- `studio.message.add`
- `studio.note.create`
- `studio.requirement.create`
- `studio.decision.create`
- `studio.question.create`
- `studio.model.entity.generate`
- `studio.model.workflow.generate`
- `studio.model.view.generate`
- `studio.validation.run`
- `studio.artifact.generate`
- `studio.artifact.export`
- `studio.promotion.request`
- `studio.promotion.approve`
- `studio.promotion.reject`

## Domain Model

Implement Studio as its own backend domain with:
- `studio_projects`
- `studio_sessions`
- `studio_messages`
- `studio_notes`
- `studio_requirements`
- `studio_decisions`
- `studio_open_questions`
- `studio_concepts`
- `studio_entities`
- `studio_workflows`
- `studio_views`
- `studio_relationships`
- `studio_artifacts`
- `studio_validations`
- `studio_promotions`

## Repository / Module Layout

Suggested structure:

```text
apps/
  api/
    app/
      modules/
        studio/
          api/
            routes.py
            schemas.py
          services/
            project_service.py
            session_service.py
            message_service.py
            extraction_service.py
            modeling_service.py
            validation_service.py
            artifact_service.py
            promotion_service.py
          models/
          domain/
          tests/
```

## API Surface

### Projects
- `POST /studio/projects`
- `GET /studio/projects`
- `GET /studio/projects/{project_id}`
- `PATCH /studio/projects/{project_id}`
- `DELETE /studio/projects/{project_id}`

### Sessions
- `POST /studio/projects/{project_id}/sessions`
- `GET /studio/projects/{project_id}/sessions`
- `GET /studio/sessions/{session_id}`

### Messages
- `POST /studio/sessions/{session_id}/messages`
- `GET /studio/sessions/{session_id}/messages`

### Structured Outputs
- `GET /studio/projects/{project_id}/notes`
- `GET /studio/projects/{project_id}/requirements`
- `GET /studio/projects/{project_id}/decisions`
- `GET /studio/projects/{project_id}/open-questions`
- `GET /studio/projects/{project_id}/concepts`
- `GET /studio/projects/{project_id}/entities`
- `GET /studio/projects/{project_id}/workflows`
- `GET /studio/projects/{project_id}/views`
- `GET /studio/projects/{project_id}/relationships`

### Validation
- `POST /studio/projects/{project_id}/validate`
- `GET /studio/projects/{project_id}/validations`

### Artifacts
- `POST /studio/projects/{project_id}/artifacts/generate`
- `GET /studio/projects/{project_id}/artifacts`
- `GET /studio/artifacts/{artifact_id}`
- `POST /studio/artifacts/{artifact_id}/export`

### Promotions
- `POST /studio/projects/{project_id}/promotions`
- `GET /studio/projects/{project_id}/promotions`

## Service Responsibilities

- `project_service` — project CRUD and scope validation
- `session_service` — session lifecycle and mode rules
- `message_service` — save messages and trigger pipeline
- `extraction_service` — notes, requirements, decisions, questions, concepts
- `modeling_service` — entities, workflows, views, relationships
- `validation_service` — deterministic checks
- `artifact_service` — summaries, design docs, schemas, API outlines, roadmaps
- `promotion_service` — proposal creation only in v1

## Core Message Processing Flow

1. authorize access to session and project
2. save user message
3. generate assistant reply
4. run extraction against relevant context
5. persist notes / requirements / decisions / open questions / concepts
6. run model updates
7. optionally run lightweight validation
8. emit audit/timeline events
9. return assistant reply plus structured change summary

## Validation Rules for V1

Start with deterministic checks:
- workflow has no states
- transition references unknown state
- duplicate entity names
- workflow references unknown entity
- implied approval flow missing actor
- view action references undefined workflow/entity

## Artifact Generation for V1

Required artifact types:
- `SUMMARY`
- `DESIGN_DOC`
- `SCHEMA_DRAFT`
- `WORKFLOW_DIAGRAM`
- `API_SPEC`
- `ROADMAP`
- `COPILOT_PACK`

## Frontend Requirements for V1

### Page 1: Studio Projects
- list projects
- create project
- filter by scope/status
- search by title

### Page 2: Studio Workspace
Three-pane layout:
- left: project/session navigation, mode selector, chat
- center: summary, notes, requirements, decisions, questions, concepts, entities, workflows, views, validation, artifacts
- right: workflow preview, schema preview, issue details, artifact preview

## Phased Build Order

1. Studio backbone
2. structured modeling
3. validation
4. artifacts
5. visuals
6. promotion scaffolding

## Tests Required

- RBAC tests
- tenant isolation tests
- message pipeline tests
- validation tests
- artifact tests
- archive / soft delete tests

## Acceptance Criteria for Studio V1

Studio v1 is acceptable when it can:
1. create business- and location-scoped Studio projects safely
2. create sessions inside projects
3. store and display chat messages
4. extract and persist notes, requirements, decisions, and open questions
5. derive basic concepts, entities, workflows, and views
6. run validation and return actionable findings
7. generate at least summary, design doc, and roadmap artifacts
8. enforce tenant isolation and RBAC
9. emit audit/timeline events for major actions
10. avoid direct mutation of production Workforce objects

## Copilot Execution Rules

- reuse repository patterns before inventing new ones
- keep patches small and reviewable
- add tests with each slice
- do not combine backbone + visuals + promotions in one patch
- do not weaken existing auth checks
- do not let Studio write into live operational tables
- keep API contracts explicit and stable
