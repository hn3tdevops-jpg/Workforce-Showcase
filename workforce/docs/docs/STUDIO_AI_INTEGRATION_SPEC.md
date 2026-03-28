# STUDIO_AI_INTEGRATION_SPEC.md

## Purpose
Define how Workforce Studio uses Communication plus AI Gateway to produce structured design outputs without collapsing module boundaries.

## Architecture rule
Studio should:
- use Communication for thread/message persistence
- use AI Gateway for model interaction
- remain owner of all structured design objects

## Core flow

### Step 1
User posts a message in a Studio session.

### Step 2
Studio resolves the linked Communication thread.

### Step 3
Communication stores the message.

### Step 4
Studio loads current project context:
- goals
- requirements
- decisions
- open questions
- concepts
- entities
- workflows
- views
- recent validations

### Step 5
Studio calls AI Gateway with:
- current mode
- recent message window
- scoped project summary
- allowed tool list
- artifact or validation intent if applicable

### Step 6
AI Gateway calls OpenAI Responses and returns normalized output.

### Step 7
Studio persists:
- assistant message into Communication
- notes/requirements/decisions/questions/entities/workflows/views into Studio
- trace metadata into AI Gateway logs

### Step 8
UI renders both:
- conversational pane from Communication
- structured pane from Studio

## Required normalized AI output contract

```json
{
  "assistant_text": "Proposed a room inspection workflow and identified one missing approval rule.",
  "notes": [],
  "requirements": [],
  "decisions": [],
  "open_questions": [],
  "concepts": [],
  "entities": [],
  "workflows": [],
  "views": [],
  "warnings": [],
  "provider_trace": {
    "provider": "openai",
    "model": "…",
    "request_log_id": "…"
  }
}
```

Studio should never parse raw provider payloads directly as its internal contract.

## Suggested linkage table

### `studio_session_threads`
- id
- studio_session_id
- comm_thread_id
- ai_conversation_link_id nullable
- created_at

This lets you map:
- Studio session
- Workforce thread
- provider-side conversation reference

## Studio-specific AI tools
These should be exposed through AI Gateway, not directly to the frontend.

- `get_project_summary`
- `list_open_questions`
- `list_requirements`
- `list_entities`
- `list_workflows`
- `create_candidate_requirement`
- `create_candidate_decision`
- `generate_workflow_diagram_spec`
- `run_validation_checks`

## Hard rules
- tools must operate only on pre-authorized project scope
- no direct provider writes into Studio tables
- no automatic promotion into production config
- all persisted structured outputs remain reviewable and auditable

## Studio data remains source of truth
Studio owns:
- `studio_projects`
- `studio_sessions`
- `studio_notes`
- `studio_requirements`
- `studio_decisions`
- `studio_open_questions`
- `studio_concepts`
- `studio_entities`
- `studio_workflows`
- `studio_views`
- `studio_relationships`
- `studio_validations`
- `studio_artifacts`
- `studio_promotions`

## API additions
- `POST /studio/sessions/{session_id}/messages`
- `GET /studio/sessions/{session_id}/messages`
- `GET /studio/projects/{project_id}/requirements`
- `GET /studio/projects/{project_id}/workflows`
- `POST /studio/projects/{project_id}/validate`
- `POST /studio/projects/{project_id}/artifacts/generate`

The Studio message endpoint should orchestrate Communication + AI Gateway + Studio persistence in one controlled backend workflow.

## Audit events
- `studio.session.thread.linked`
- `studio.ai.reply.generated`
- `studio.ai.extraction.persisted`
- `studio.ai.validation.persisted`
- `studio.ai.artifact.generated`

## Recommended rollout

### Phase 1
- Studio session linked to Communication thread
- manual or placeholder assistant reply path

### Phase 2
- AI Gateway-powered structured extraction
- notes/requirements/questions

### Phase 3
- entities/workflows/views derivation
- validation flow

### Phase 4
- artifact generation
- promotion proposal scaffolding
