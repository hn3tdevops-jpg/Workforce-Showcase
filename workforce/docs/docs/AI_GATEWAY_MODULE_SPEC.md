# AI_GATEWAY_MODULE_SPEC.md

## Purpose
A shared Workforce module that centralizes all OpenAI interaction, model routing, prompt management, tool definitions, structured parsing, request tracing, and provider abstraction.

## Why it exists
Without this layer, OpenAI logic leaks into Studio, Communication, and future modules. That creates duplicated prompts, inconsistent response parsing, weak observability, and poor control over tenancy-safe tool access.

## Owns
- provider config
- model profiles
- prompt templates
- tool definitions
- response parsers
- request/response metadata
- trace IDs
- eval and versioning records
- provider conversation linkage records

## Must not own
- tenant authorization truth
- Studio project graph
- Communication messages as source of truth
- direct mutation of production operational tables

## Core responsibilities
- call OpenAI Responses
- select model by task type
- construct system prompt and tool set
- normalize model output into Workforce-friendly contracts
- capture usage, request IDs, latency, and failures
- keep provider-specific details out of other modules

## Recommended internal service methods
- `generate_reply(scope_context, thread_context, prompt_profile)`
- `extract_structured_design_items(project_context, message_context)`
- `generate_artifact(project_context, artifact_type)`
- `run_validation_pass(project_context)`
- `summarize_thread(thread_context)`

## Suggested tables

### `ai_provider_accounts`
- id
- provider_key
- scope_type
- business_id nullable
- location_id nullable
- config_ref
- status
- created_at
- updated_at

### `ai_model_profiles`
- id
- model_name
- pinned_version nullable
- purpose enum(`CHAT`,`EXTRACTION`,`VALIDATION`,`ARTIFACT`)
- prompt_template_id nullable
- active
- created_at
- updated_at

### `ai_prompt_templates`
- id
- module_key
- prompt_key
- version
- template_body
- active
- created_at

### `ai_tool_definitions`
- id
- tool_key
- module_key
- schema_json
- execution_policy_json
- active
- created_at

### `ai_conversation_links`
- id
- provider_key
- local_scope_type
- local_scope_id
- openai_conversation_id
- last_response_id nullable
- created_at
- updated_at

### `ai_request_logs`
- id
- local_scope_type
- local_scope_id
- request_type
- provider_key
- model_name
- prompt_template_version
- x_client_request_id
- x_request_id nullable
- token_usage_json nullable
- latency_ms nullable
- status
- error_json nullable
- created_at

## Internal API surface
- `POST /internal/ai/reply`
- `POST /internal/ai/extract`
- `POST /internal/ai/validate`
- `POST /internal/ai/artifact`
- `GET /internal/ai/request-logs/{id}`

## Security rules
- OpenAI keys are server-only secrets
- no browser-direct OpenAI calls
- all tool calls must be pre-authorized against Workforce RBAC and scope
- no arbitrary tenant browsing by the model
- provider outputs are suggestions until Workforce persists approved structured changes

## Model strategy
Use separate model profiles for:
- Studio conversation
- structured extraction
- validation
- artifact generation

## Audit events
- `ai.request.created`
- `ai.request.completed`
- `ai.request.failed`
- `ai.model_profile.used`
- `ai.tool.called`

## Phase recommendation

### Phase 1
- provider config
- model profile registry
- request logging
- basic Responses wrapper

### Phase 2
- prompt registry
- tool registry
- structured parsers
- Studio integration path

### Phase 3
- eval/version controls
- fallback strategies
- broader module reuse
