# COMMUNICATION_MODULE_SPEC.md

## Purpose
A shared Workforce interaction module for threads, messages, participants, attachments, message links, delivery state, and AI/human conversation history.

## Why it exists
Every major Workforce module will eventually need structured communication:
- Studio brainstorming threads
- approval discussions
- issue/task conversations
- AI assistant interactions
- manager/employee module-linked conversations

Build it once, use it everywhere.

## Owns
- threads
- participants
- messages
- attachments
- message links
- delivery/read state
- thread visibility and status

## Must not own
- Studio requirements/entities/workflows
- AI prompt logic
- provider-specific OpenAI contracts
- module-specific structured business meaning

## Core responsibilities
- create and manage threads
- link threads to business/location/module records
- store human, assistant, and system messages
- enforce participant visibility and membership
- support attachments and references
- serve as conversation source of truth across Workforce

## Suggested tables

### `comm_threads`
- id
- business_id
- location_id nullable
- scope_type
- thread_type
- module_type nullable
- module_ref_id nullable
- title nullable
- status
- created_by
- created_at
- updated_at

### `comm_thread_participants`
- id
- thread_id
- participant_type enum(`USER`,`SYSTEM_AGENT`,`AI_AGENT`)
- user_id nullable
- agent_key nullable
- role_in_thread nullable
- joined_at

### `comm_messages`
- id
- thread_id
- sender_type enum(`USER`,`ASSISTANT`,`SYSTEM`)
- sender_user_id nullable
- sender_agent_key nullable
- body
- content_json nullable
- visibility_scope nullable
- created_at

### `comm_attachments`
- id
- message_id
- file_ref
- attachment_type
- metadata_json
- created_at

### `comm_message_links`
- id
- message_id
- linked_object_type
- linked_object_id
- created_at

### `comm_read_state`
- id
- thread_id
- user_id
- last_read_message_id nullable
- updated_at

## Thread types
- general
- module_discussion
- studio_session
- approval
- issue
- AI_assistant
- support

## API surface
- `POST /communication/threads`
- `GET /communication/threads`
- `GET /communication/threads/{thread_id}`
- `POST /communication/threads/{thread_id}/messages`
- `GET /communication/threads/{thread_id}/messages`
- `POST /communication/threads/{thread_id}/participants`
- `GET /communication/threads/{thread_id}/participants`

## RBAC expectations
- communication access must still be scoped by business/location
- thread access may also be narrowed by linked module permissions
- AI-visible thread content must be filtered before leaving Workforce

## Audit events
- `communication.thread.create`
- `communication.thread.update`
- `communication.message.add`
- `communication.participant.add`
- `communication.attachment.add`

## Design rule
Communication is the transport and history layer. It is not the owner of Studio’s design graph and not the place where raw OpenAI orchestration should live.

## Phase recommendation

### Phase 1
- thread/message/participant backbone

### Phase 2
- module linking
- read state
- attachment support

### Phase 3
- AI-linked threads
- richer collaboration features
