# COPILOT_INSTALL_AI_COMM_STUDIO_SPEC_PACK_PROMPT.md

Install the attached AI/Communication/Studio architecture spec pack into the current Workforce repo.

## Goals
- add the three spec files into the repo planning docs
- preserve the boundaries between Communication, AI Gateway, and Studio
- prepare these specs for later conversion into `HN3T_MASTER_PLAN.md` execution sections

## Required placement
- `docs/planning/specs/AI_GATEWAY_MODULE_SPEC.md`
- `docs/planning/specs/COMMUNICATION_MODULE_SPEC.md`
- `docs/planning/specs/STUDIO_AI_INTEGRATION_SPEC.md`

## Required behavior
- reuse current repo file/folder conventions if they differ slightly
- add or update a planning README that links the new files
- do not rewrite unrelated planning files
- do not merge these three specs into one file
- do not change Workforce tenant/RBAC assumptions
- do not implement code yet unless explicitly asked

## Architecture rules
- Communication owns threads/messages/participants/attachments
- AI Gateway owns OpenAI integration, prompts, tools, parsing, and request logs
- Studio owns structured design objects and uses Communication + AI Gateway

## Follow-up suggestion
After install, generate:
1. `HN3T_MASTER_PLAN` section for AI Gateway
2. `HN3T_MASTER_PLAN` section for Communication
3. `HN3T_MASTER_PLAN` section for Studio AI integration
