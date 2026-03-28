## 25) WORKFORCE STUDIO V1 — BUILD ORDER (Phases)

### Goal
Build Workforce Studio v1 as a safe, tenant-aware, RBAC-enforced, audit-visible design workspace module for Workforce.

Studio v1 must:
- support design-only projects and sessions
- convert brainstorming into structured design records
- derive basic models like concepts, entities, workflows, and views
- run validation
- generate artifacts
- avoid direct mutation of live operational Workforce data

### Non-Negotiable Constraints
- Never weaken tenant isolation
- Never bypass RBAC
- Never let Studio mutate live operational data in v1
- Always emit audit/timeline events for major Studio actions
- Prefer small, reviewable patches
- Add tests for every permission boundary and scope rule
- Reuse existing repo patterns for API, services, models, and tests

### Phase 1 — Studio domain registration and permission foundation
- [ ] Add Studio permission keys to the centralized permission registry
- [ ] Add Studio domain enums and constants for scope, session mode, note type, requirement type, artifact type, validation severity, and promotion status
- [ ] Add Studio module/domain permission constants for backend reuse
- [ ] Register Studio routes in the main API router behind existing auth dependencies
- [ ] Add Studio module import wiring so models are included in metadata/model registration
- [ ] Add baseline tests proving Studio permissions exist and are loadable through current permission bootstrapping

**Exit criteria**
- Studio permission keys exist
- Studio domain constants/enums exist
- Studio router is registered
- Studio models can be registered safely without breaking startup

### Phase 2 — Studio project persistence backbone
- [ ] Create migration for `studio_projects`
- [ ] Add SQLAlchemy model for `studio_projects`
- [ ] Add Pydantic/API schemas for Studio project create/read/update
- [ ] Implement Studio project repository/service for create/get/list/update/archive
- [ ] Implement `POST /studio/projects`
- [ ] Implement `GET /studio/projects`
- [ ] Implement `GET /studio/projects/{project_id}`
- [ ] Implement `PATCH /studio/projects/{project_id}`
- [ ] Implement soft archive behavior for Studio projects instead of hard delete
- [ ] Emit audit/timeline events for Studio project create/update/archive
- [ ] Add tests for Studio project creation
- [ ] Add tests for Studio project listing with tenant scoping
- [ ] Add tests for Studio project retrieval access control
- [ ] Add tests for Studio project archive behavior

**Exit criteria**
- Users with correct permissions can create/read/update/archive Studio projects
- Business and location scoping is enforced
- Audit events are emitted
- Archived projects behave correctly

### Phase 3 — Studio session backbone
- [ ] Create migration for `studio_sessions`
- [ ] Add SQLAlchemy model for `studio_sessions`
- [ ] Add Pydantic/API schemas for Studio session create/read/list
- [ ] Implement Studio session repository/service
- [ ] Implement `POST /studio/projects/{project_id}/sessions`
- [ ] Implement `GET /studio/projects/{project_id}/sessions`
- [ ] Implement `GET /studio/sessions/{session_id}`
- [ ] Enforce project-scope-aware access checks for session operations
- [ ] Emit audit/timeline events for Studio session creation
- [ ] Add tests for Studio session creation under permitted projects
- [ ] Add tests for Studio session access denial across tenant boundaries
- [ ] Add tests for Studio session listing by project

**Exit criteria**
- Sessions can be created and listed inside accessible projects
- Session access respects project scope and RBAC
- Session create events are logged

### Phase 4 — Studio message backbone
- [ ] Create migration for `studio_messages`
- [ ] Add SQLAlchemy model for `studio_messages`
- [ ] Add Pydantic/API schemas for Studio message create/read
- [ ] Implement Studio message repository/service for storing session messages
- [ ] Implement `POST /studio/sessions/{session_id}/messages` with authenticated user message creation
- [ ] Implement `GET /studio/sessions/{session_id}/messages`
- [ ] Emit audit/timeline events for Studio message creation
- [ ] Add tests for Studio message posting
- [ ] Add tests for Studio message history retrieval
- [ ] Add tests for Studio message access denial across unauthorized sessions

### Phase 5 — Structured extraction Phase 1
- [ ] Create migration for `studio_notes`
- [ ] Create migration for `studio_requirements`
- [ ] Create migration for `studio_open_questions`
- [ ] Add SQLAlchemy models for those tables
- [ ] Implement `extraction_service` placeholder with deterministic extraction rules
- [ ] Persist extracted notes from message pipeline
- [ ] Persist extracted requirements from message pipeline
- [ ] Persist extracted Studio open questions from message pipeline
- [ ] Implement list APIs for notes, requirements, and open questions
- [ ] Return structured change summary from `POST /studio/sessions/{session_id}/messages`
- [ ] Add tests verifying note extraction, requirement extraction, and question extraction

### Phase 6 — Structured extraction Phase 2
- [ ] Create migration for `studio_decisions`
- [ ] Add SQLAlchemy model for `studio_decisions`
- [ ] Extend extraction service to detect and persist decision candidates
- [ ] Implement `GET /studio/projects/{project_id}/decisions`
- [ ] Add tests verifying decision extraction and storage

### Phase 7 — Concepts, entities, workflows, views, relationships
- [ ] Create migrations and models for `studio_concepts`, `studio_entities`, `studio_workflows`, `studio_views`, and `studio_relationships`
- [ ] Implement `modeling_service`
- [ ] Add concept derivation
- [ ] Add entity derivation
- [ ] Add workflow derivation
- [ ] Add view derivation
- [ ] Add relationship generation
- [ ] Implement read APIs for concepts, entities, workflows, views, and relationships
- [ ] Add tests for each derived object type and relationship access safety

### Phase 8 — Validation foundation
- [ ] Create migration for `studio_validations`
- [ ] Add SQLAlchemy model for `studio_validations`
- [ ] Implement `validation_service`
- [ ] Add deterministic validation rules
- [ ] Implement `POST /studio/projects/{project_id}/validate`
- [ ] Implement `GET /studio/projects/{project_id}/validations`
- [ ] Emit audit/timeline events for validation runs
- [ ] Add tests for each validation rule

### Phase 9 — Artifact persistence and generation
- [ ] Create migration for `studio_artifacts`
- [ ] Add SQLAlchemy model for `studio_artifacts`
- [ ] Implement artifact service foundation
- [ ] Generate `SUMMARY` and `DESIGN_DOC`
- [ ] Generate `SCHEMA_DRAFT`, `API_SPEC`, and `ROADMAP`
- [ ] Generate `COPILOT_PACK`
- [ ] Generate `WORKFLOW_DIAGRAM`
- [ ] Implement artifact read/list endpoints and export hook
- [ ] Add artifact tests

### Phase 10 — Frontend workspace
- [ ] Add Studio projects list page
- [ ] Add Studio project create flow
- [ ] Add Studio project detail/workspace shell
- [ ] Add session list and chat UI
- [ ] Add structured output tabs
- [ ] Add change summary UI
- [ ] Add validation and artifact panels
- [ ] Add right-pane visual foundation

### Phase 11 — Promotions scaffolding
- [ ] Create migration for `studio_promotions`
- [ ] Add SQLAlchemy model for `studio_promotions`
- [ ] Implement promotion request service without production apply behavior
- [ ] Implement request/list endpoints for promotions
- [ ] Add tests verifying promotions do not mutate production data

### Definition of Done — Workforce Studio v1
- [ ] authorized users can create business- and location-scoped Studio projects
- [ ] authorized users can create sessions and post chat messages
- [ ] messages generate structured notes, requirements, decisions, and open questions
- [ ] Studio derives basic concepts, entities, workflows, views, and relationships
- [ ] Studio can run deterministic validation and store findings
- [ ] Studio can generate summary, design doc, schema draft, API spec, roadmap, Copilot pack, and workflow diagram artifacts
- [ ] Studio UI supports project/session/chat/structured output/artifact review
- [ ] Studio emits audit/timeline events for major actions
- [ ] Studio remains fully tenant safe and RBAC enforced
- [ ] Studio does not directly mutate live operational Workforce data
