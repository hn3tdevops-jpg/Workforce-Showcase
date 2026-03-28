# WORKFORCE_STUDIO_IMPLEMENTATION_SPEC.md

## 1. Purpose

Workforce Studio is a new module for Workforce that provides an AI-assisted design workspace for brainstorming, structuring, modeling, validating, visualizing, and exporting new operational modules, workflows, rules, and interfaces.

Studio v1 is design-only. It must not directly mutate live production operational state.

Studio converts natural brainstorming into:
- structured notes
- requirements
- decisions
- open questions
- concepts
- entities
- workflows
- views
- diagrams
- validation findings
- exportable implementation artifacts

This module must align with existing Workforce foundations:
- multi-tenant scope safety
- role-based access control
- audit/timeline events
- modular backend boundaries
- clean API contracts
- staged build order
- Copilot-friendly implementation units

## 2. Product definition

### Official module name
**Workforce Studio**

### Working one-line description
AI-assisted project, workflow, and module design workspace for Workforce.

### Primary job
Convert brainstorming into structured, visual, technically actionable blueprints.

### V1 constraint
Studio must not directly modify live production workflows, schedules, units, tasks, or other operational state.

## 3. Build principles

### 3.1 Tenant safety first
Never allow cross-business or cross-location data leakage.

### 3.2 RBAC integrity first
All access must be permission-based through roles only.

### 3.3 Design workspace separate from production objects
Studio data is its own domain. It may reference production concepts, but must not mutate them directly in v1.

### 3.4 Auditability required
Important creation, update, generation, validation, and export actions must emit audit/timeline events.

### 3.5 Structured data over loose text
Conversation is stored, but the core value comes from extracted structured objects.

### 3.6 Confirmed vs inferred must be explicit
Generated items should support status values such as:
- confirmed
- inferred
- suggested
- unresolved

### 3.7 Small reviewable increments
Each phase should be buildable and testable independently.

## 4. Module boundaries

Studio owns:
- design projects
- design sessions
- studio messages
- extracted notes
- requirements
- decisions
- open questions
- concepts
- entities
- workflows
- views
- relationships
- artifacts
- validations
- promotions

Studio may reference:
- business
- location
- users
- roles
- permissions
- audit events
- timeline events
- existing module types

Studio does not own:
- employees
- schedules
- live assignments
- live units/rooms
- live tasks
- live inspections
- live issues
- live tickets/orders
- live menu objects

## 5. Suggested repository placement

Example backend placement:

```text
apps/
  api/
    app/
      modules/
        studio/
          api/
          services/
          models/
          repositories/
          domain/
          tests/
```

Preserve repo conventions, but keep Studio internally separated.

## 6. Domain model

Recommended initial relational schema:

### `studio_projects`
Fields:
- id
- business_id nullable
- location_id nullable
- scope_type ENUM('PLATFORM','BUSINESS','LOCATION')
- title
- slug
- summary nullable
- domain_type nullable
- status ENUM('DRAFT','ACTIVE','REVIEW','APPROVED','ARCHIVED')
- created_by
- updated_by nullable
- created_at
- updated_at

### `studio_sessions`
Fields:
- id
- project_id
- title nullable
- mode ENUM('EXPLORE','STRUCTURE','MODEL','VISUALIZE','VALIDATE','HANDOFF')
- started_by
- created_at
- updated_at

### `studio_messages`
Fields:
- id
- session_id
- role ENUM('USER','ASSISTANT','SYSTEM')
- content TEXT
- metadata_json nullable
- created_at

### `studio_notes`
Fields:
- id
- project_id
- note_type ENUM('GOAL','CONSTRAINT','ASSUMPTION','RULE','RISK','QUESTION','DECISION','SUMMARY')
- title
- body
- confidence_score nullable
- status ENUM('CONFIRMED','INFERRED','SUGGESTED','UNRESOLVED')
- source_message_id nullable
- created_by_system boolean default true
- created_at
- updated_at

### `studio_requirements`
Fields:
- id
- project_id
- requirement_type ENUM('FUNCTIONAL','NON_FUNCTIONAL','UI','WORKFLOW','PERMISSION','INTEGRATION','AUTOMATION')
- priority ENUM('LOW','MEDIUM','HIGH','CRITICAL')
- statement
- rationale nullable
- status ENUM('DRAFT','CONFIRMED','REJECTED','SUPERSEDED')
- source_message_id nullable
- created_at
- updated_at

### `studio_decisions`
Fields:
- id
- project_id
- title
- decision_text
- rationale nullable
- alternatives_json nullable
- impact_json nullable
- decided_by nullable
- created_at

### `studio_open_questions`
Fields:
- id
- project_id
- question
- why_it_matters nullable
- severity ENUM('LOW','MEDIUM','HIGH','BLOCKING')
- blocking_area nullable
- suggested_options_json nullable
- resolved_at nullable
- created_at

### `studio_concepts`
Fields:
- id
- project_id
- name
- concept_type nullable
- summary nullable
- status ENUM('DRAFT','ACTIVE','REVIEWED','ARCHIVED')
- metadata_json nullable
- created_at
- updated_at

### `studio_entities`
Fields:
- id
- project_id
- name
- description nullable
- fields_json
- constraints_json nullable
- lifecycle_json nullable
- status ENUM('DRAFT','CONFIRMED','REVIEWED','REJECTED')
- created_at
- updated_at

### `studio_workflows`
Fields:
- id
- project_id
- name
- workflow_type nullable
- description nullable
- actors_json nullable
- states_json nullable
- transitions_json nullable
- rules_json nullable
- exceptions_json nullable
- status ENUM('DRAFT','CONFIRMED','REVIEWED','REJECTED')
- created_at
- updated_at

### `studio_views`
Fields:
- id
- project_id
- name
- audience nullable
- purpose nullable
- layout_json nullable
- components_json nullable
- actions_json nullable
- data_dependencies_json nullable
- status ENUM('DRAFT','CONFIRMED','REVIEWED','REJECTED')
- created_at
- updated_at

### `studio_relationships`
Fields:
- id
- project_id
- source_object_type
- source_object_id
- relation_type
- target_object_type
- target_object_id
- metadata_json nullable
- created_at

### `studio_artifacts`
Fields:
- id
- project_id
- artifact_type ENUM('SUMMARY','DESIGN_DOC','SCHEMA_DRAFT','WORKFLOW_DIAGRAM','ERD','WIREFRAME','API_SPEC','PERMISSION_MATRIX','ROADMAP','COPILOT_PACK','PDF_EXPORT')
- version_no
- content_ref
- metadata_json nullable
- generated_by nullable
- created_at

### `studio_validations`
Fields:
- id
- project_id
- validation_type
- findings_json
- severity_summary_json nullable
- created_at

### `studio_promotions`
Fields:
- id
- project_id
- promotion_type
- target_module nullable
- target_object_ref nullable
- payload_json
- status ENUM('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','APPLIED')
- requested_by
- approved_by nullable
- created_at
- updated_at

## 7. Permission model

Suggested keys:
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

## 8. Audit and timeline events

Recommended event keys:
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

## 9. API design

Focused v1 surface:

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

### Structured outputs
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

### Promotions
- `POST /studio/projects/{project_id}/promotions`
- `GET /studio/projects/{project_id}/promotions`

## 10. Service layer responsibilities

- project service
- session service
- message service
- extraction service
- modeling service
- validation service
- artifact service
- promotion service

## 11. Processing pipeline for POST message

1. authorize access
2. save user message
3. generate assistant reply
4. extract structured candidates
5. persist notes / requirements / decisions / open questions
6. update concepts/entities/workflows/views
7. recompute relationships if needed
8. optionally run lightweight validation
9. emit audit/timeline events
10. return assistant reply plus change summary

## 12. Validation rules for v1

Recommended checks:
- workflow has zero states
- transition references missing state
- transition missing source or target
- workflow implies actor but actors list empty
- duplicate entity names in same project
- entity field definitions invalid or empty
- workflow references unknown entity
- requirement mentions approval/manager/admin but no role or permission rule linked
- view action references undefined workflow/entity
- conflicting decisions

## 13. Artifact generation for v1

Must-have artifacts:
- summary
- design doc
- workflow diagram spec
- schema draft
- API outline
- roadmap
- Copilot pack

## 14. Frontend specification for v1

### Project list page
- list projects
- create project
- filter by scope/status

### Project workspace page
Three-pane layout:
- left: sessions list, mode switcher, chat thread
- center: structured tabs
- right: visual / inspector panel

### Required UX behavior
After each meaningful message, show a change summary.

## 15. Suggested build phases

1. backend foundation
2. structured modeling
3. validation
4. artifacts
5. visuals
6. promotions scaffolding

## 16. Test strategy

Cover:
- RBAC
- tenant isolation
- message pipeline
- validation rules
- artifact generation
- archive/soft delete behavior

## 17. Minimum acceptance definition for Studio v1

Studio v1 is done when it can:
1. create Studio projects with correct scope
2. create sessions
3. store and display chat messages
4. store notes/requirements/decisions/open questions
5. derive basic concepts/entities/workflows/views
6. run validation and return findings
7. generate summary, design doc, and roadmap artifacts
8. enforce RBAC and tenant safety
9. emit audit/timeline events
10. avoid mutating production operational data

## 18. Copilot operating instructions for this module

- Reuse repository patterns
- Do not weaken tenant isolation or RBAC
- Prefer additive, reviewable patches
- Use existing audit/timeline infrastructure
- Keep Studio separate from live operational state
- Prefer read-only derived model APIs before manual editing complexity
- Keep migrations explicit and reversible
- Add tests for every permission gate and scope rule
- Do not implement live promotion apply flows in v1
