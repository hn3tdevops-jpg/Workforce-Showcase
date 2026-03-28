## 25) WORKFORCE STUDIO V1 — ATOMIC EXECUTION PLAN

### Goal
Build Workforce Studio v1 as a tenant-safe, RBAC-enforced, audit-visible, design-only Workforce module.

### Rules
- Never weaken tenant isolation
- Never bypass RBAC
- Never mutate live operational data in v1
- Always emit audit/timeline events for major Studio actions
- Prefer one small patch per checkbox
- Add tests with each behavior change
- Reuse existing repo patterns

### Phase 1 — Domain registration
- [ ] Add Studio permission keys to the centralized permission registry
- [ ] Add Studio scope type enum definitions
- [ ] Add Studio session mode enum definitions
- [ ] Add Studio note type enum definitions
- [ ] Add Studio requirement type enum definitions
- [ ] Add Studio artifact type enum definitions
- [ ] Add Studio validation severity enum definitions
- [ ] Add Studio promotion status enum definitions
- [ ] Add Studio domain constants module
- [ ] Add Studio permission constants module
- [ ] Register Studio routes in the main API router
- [ ] Register Studio model imports in model metadata/bootstrap wiring
- [ ] Add test verifying Studio permissions are loadable from permission bootstrapping

### Phase 2 — `studio_projects` migration and model
- [ ] Create migration for `studio_projects`
- [ ] Add SQLAlchemy model for `studio_projects`
- [ ] Add model indexes/constraints for `studio_projects`
- [ ] Add project create request schema
- [ ] Add project update request schema
- [ ] Add project response schema
- [ ] Add project list response schema
- [ ] Add project repository create method
- [ ] Add project repository get method
- [ ] Add project repository list method
- [ ] Add project repository update method
- [ ] Add project repository archive method
- [ ] Add project service scope validation logic
- [ ] Add project service create logic
- [ ] Add project service list logic
- [ ] Add project service get logic
- [ ] Add project service update logic
- [ ] Add project service archive logic
- [ ] Add `POST /studio/projects`
- [ ] Add `GET /studio/projects`
- [ ] Add `GET /studio/projects/{project_id}`
- [ ] Add `PATCH /studio/projects/{project_id}`
- [ ] Add archive handler for Studio projects
- [ ] Emit audit event for Studio project create
- [ ] Emit audit event for Studio project update
- [ ] Emit audit event for Studio project archive
- [ ] Add test for creating a business-scoped Studio project
- [ ] Add test for creating a location-scoped Studio project
- [ ] Add test rejecting invalid scope combinations for Studio project create
- [ ] Add test for listing only accessible Studio projects
- [ ] Add test rejecting unauthorized Studio project read
- [ ] Add test verifying archived Studio projects are excluded by default

### Phase 3 — `studio_sessions` migration and model
- [ ] Create migration for `studio_sessions`
- [ ] Add SQLAlchemy model for `studio_sessions`
- [ ] Add model indexes/constraints for `studio_sessions`
- [ ] Add session create request schema
- [ ] Add session response schema
- [ ] Add session list response schema
- [ ] Add session repository create method
- [ ] Add session repository get method
- [ ] Add session repository list-by-project method
- [ ] Add session service create logic
- [ ] Add session service get logic
- [ ] Add session service list-by-project logic
- [ ] Add session service access check against project scope
- [ ] Add `POST /studio/projects/{project_id}/sessions`
- [ ] Add `GET /studio/projects/{project_id}/sessions`
- [ ] Add `GET /studio/sessions/{session_id}`
- [ ] Emit audit event for Studio session create
- [ ] Add test for creating a Studio session in an authorized project
- [ ] Add test rejecting Studio session create in unauthorized project
- [ ] Add test listing sessions only for accessible project
- [ ] Add test rejecting Studio session read across tenant boundary

### Phase 4 — `studio_messages` migration and model
- [ ] Create migration for `studio_messages`
- [ ] Add SQLAlchemy model for `studio_messages`
- [ ] Add model indexes/constraints for `studio_messages`
- [ ] Add message create request schema
- [ ] Add message response schema
- [ ] Add message list response schema
- [ ] Add message repository create method
- [ ] Add message repository list-by-session method
- [ ] Add message service create-user-message logic
- [ ] Add message service list-by-session logic
- [ ] Add `POST /studio/sessions/{session_id}/messages`
- [ ] Add `GET /studio/sessions/{session_id}/messages`
- [ ] Emit audit event for Studio message add
- [ ] Add test for posting a user message to an authorized session
- [ ] Add test for reading Studio message history
- [ ] Add test rejecting message access across unauthorized session scope

### Phase 5 — `studio_notes`, `studio_requirements`, and `studio_open_questions`
- [ ] Create migration for `studio_notes`
- [ ] Create migration for `studio_requirements`
- [ ] Create migration for `studio_open_questions`
- [ ] Add SQLAlchemy model for `studio_notes`
- [ ] Add SQLAlchemy model for `studio_requirements`
- [ ] Add SQLAlchemy model for `studio_open_questions`
- [ ] Add repository list/bulk-create methods for notes, requirements, and open questions
- [ ] Add `GET /studio/projects/{project_id}/notes`
- [ ] Add `GET /studio/projects/{project_id}/requirements`
- [ ] Add `GET /studio/projects/{project_id}/open-questions`
- [ ] Emit audit events for note, requirement, and question creation

### Phase 6 — Extraction service placeholder
- [ ] Add `extraction_service` module
- [ ] Add extraction result dataclass/schema definitions
- [ ] Add deterministic note extraction rule set
- [ ] Add deterministic requirement extraction rule set
- [ ] Add deterministic open-question extraction rule set
- [ ] Add extraction service unit test for note extraction
- [ ] Add extraction service unit test for requirement extraction
- [ ] Add extraction service unit test for open-question extraction

### Phase 7 — Message pipeline integration
- [ ] Update message service to call extraction service after saving user message
- [ ] Persist extracted notes in message pipeline
- [ ] Persist extracted requirements in message pipeline
- [ ] Persist extracted open questions in message pipeline
- [ ] Add assistant message placeholder creation in message pipeline
- [ ] Return assistant message from message post response
- [ ] Return `notes_added` count from message post response
- [ ] Return `requirements_added` count from message post response
- [ ] Return `questions_added` count from message post response
- [ ] Add tests verifying structured rows are created when posting a message
- [ ] Add test verifying message post response includes structured change summary

### Phase 8 — `studio_decisions`
- [ ] Create migration for `studio_decisions`
- [ ] Add SQLAlchemy model for `studio_decisions`
- [ ] Add decision response schema
- [ ] Add decision list response schema
- [ ] Add decisions repository bulk-create method
- [ ] Add decisions repository list-by-project method
- [ ] Add deterministic decision extraction rule set
- [ ] Persist extracted decisions in message pipeline
- [ ] Add `GET /studio/projects/{project_id}/decisions`
- [ ] Emit audit event for Studio decision create
- [ ] Return `decisions_added` count from message post response

### Phase 9 — `studio_concepts`
- [ ] Create migration for `studio_concepts`
- [ ] Add SQLAlchemy model for `studio_concepts`
- [ ] Add concepts repository upsert/list methods
- [ ] Add basic concept derivation rule set
- [ ] Persist derived concepts in message pipeline
- [ ] Add `GET /studio/projects/{project_id}/concepts`
- [ ] Emit audit event for Studio concept generation

### Phase 10 — `studio_entities`
- [ ] Create migration for `studio_entities`
- [ ] Add SQLAlchemy model for `studio_entities`
- [ ] Add entities repository upsert/list methods
- [ ] Add `modeling_service` module
- [ ] Add basic entity derivation rule set
- [ ] Persist derived entities in modeling pipeline
- [ ] Add `GET /studio/projects/{project_id}/entities`
- [ ] Emit audit event for Studio entity generation

### Phase 11 — `studio_workflows`
- [ ] Create migration for `studio_workflows`
- [ ] Add SQLAlchemy model for `studio_workflows`
- [ ] Add workflows repository upsert/list methods
- [ ] Add basic workflow derivation rule set
- [ ] Persist derived workflows in modeling pipeline
- [ ] Add `GET /studio/projects/{project_id}/workflows`
- [ ] Emit audit event for Studio workflow generation

### Phase 12 — `studio_views`
- [ ] Create migration for `studio_views`
- [ ] Add SQLAlchemy model for `studio_views`
- [ ] Add views repository upsert/list methods
- [ ] Add basic view derivation rule set
- [ ] Persist derived views in modeling pipeline
- [ ] Add `GET /studio/projects/{project_id}/views`
- [ ] Emit audit event for Studio view generation

### Phase 13 — `studio_relationships`
- [ ] Create migration for `studio_relationships`
- [ ] Add SQLAlchemy model for `studio_relationships`
- [ ] Add relationships repository bulk-upsert/list methods
- [ ] Add relationship generation logic between concepts, entities, workflows, views, and requirements
- [ ] Add `GET /studio/projects/{project_id}/relationships`

### Phase 14 — `studio_validations`
- [ ] Create migration for `studio_validations`
- [ ] Add SQLAlchemy model for `studio_validations`
- [ ] Add validations repository create/list methods
- [ ] Add `validation_service` module
- [ ] Add validation rule for workflow with no states
- [ ] Add validation rule for transition referencing unknown state
- [ ] Add validation rule for duplicate entity names
- [ ] Add validation rule for workflow referencing unknown entity
- [ ] Add validation rule for implied approval flow missing actor
- [ ] Add validation rule for view action referencing undefined workflow/entity
- [ ] Add `POST /studio/projects/{project_id}/validate`
- [ ] Add `GET /studio/projects/{project_id}/validations`
- [ ] Emit audit event for Studio validation run

### Phase 15 — `studio_artifacts`
- [ ] Create migration for `studio_artifacts`
- [ ] Add SQLAlchemy model for `studio_artifacts`
- [ ] Add artifacts repository create/get/list methods
- [ ] Add `artifact_service` module
- [ ] Add `GET /studio/projects/{project_id}/artifacts`
- [ ] Add `GET /studio/artifacts/{artifact_id}`

### Phase 16 — Artifact generation
- [ ] Add summary artifact builder
- [ ] Add design-doc artifact builder
- [ ] Add schema-draft artifact builder
- [ ] Add API-spec artifact builder
- [ ] Add roadmap artifact builder
- [ ] Add Copilot-pack artifact builder
- [ ] Add workflow-diagram artifact builder
- [ ] Add `POST /studio/projects/{project_id}/artifacts/generate`
- [ ] Add `POST /studio/artifacts/{artifact_id}/export`

### Phase 17 — Frontend MVP
- [ ] Add Studio projects list page
- [ ] Add Studio project create form
- [ ] Add Studio project detail page shell
- [ ] Add Studio sessions list panel
- [ ] Add Studio chat thread component
- [ ] Add Studio message composer component
- [ ] Add Notes, Requirements, Decisions, and Open Questions tabs
- [ ] Render message-post change summary in UI

### Phase 18 — Frontend structured tabs and visuals
- [ ] Add Concepts tab
- [ ] Add Entities tab
- [ ] Add Workflows tab
- [ ] Add Views tab
- [ ] Add Validation tab
- [ ] Add Artifacts tab
- [ ] Add Studio right-pane inspector shell
- [ ] Add workflow-diagram artifact preview component
- [ ] Add entity/schema preview component

### Phase 19 — `studio_promotions` scaffolding
- [ ] Create migration for `studio_promotions`
- [ ] Add SQLAlchemy model for `studio_promotions`
- [ ] Add promotions repository create/list methods
- [ ] Add `promotion_service` module
- [ ] Add `POST /studio/projects/{project_id}/promotions`
- [ ] Add `GET /studio/projects/{project_id}/promotions`
- [ ] Emit audit event for Studio promotion request
- [ ] Add test verifying promotion request does not mutate operational tables

### Definition of Done
- [ ] Authorized users can create Studio projects with valid scope
- [ ] Authorized users can create Studio sessions
- [ ] Authorized users can post and read Studio messages
- [ ] Messages generate notes, requirements, decisions, and open questions
- [ ] Studio derives concepts, entities, workflows, views, and relationships
- [ ] Studio validation runs and stores findings
- [ ] Studio generates summary, design doc, schema draft, API spec, roadmap, Copilot pack, and workflow diagram artifacts
- [ ] Studio frontend supports project, session, chat, structured outputs, validations, and artifacts
- [ ] Studio emits audit/timeline events for major actions
- [ ] Studio never mutates live operational Workforce data in v1
