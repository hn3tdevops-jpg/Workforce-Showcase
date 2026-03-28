# COPILOT_INSTALL_AI_COMM_STUDIO_SPEC_PACK.md

## Purpose
Install these specs into the current Workforce repo as planning and architecture source documents.

## Recommended target placement
- `docs/planning/specs/AI_GATEWAY_MODULE_SPEC.md`
- `docs/planning/specs/COMMUNICATION_MODULE_SPEC.md`
- `docs/planning/specs/STUDIO_AI_INTEGRATION_SPEC.md`
- `docs/planning/reference/Workforce_AI_Communication_Studio_Spec_Pack_Reference.pdf`

## Recommended merge behavior
1. Copy the three spec files into `docs/planning/specs/`
2. Add a README entry linking them
3. Convert each spec into one or more `HN3T_MASTER_PLAN.md` sections
4. Keep Communication, AI Gateway, and Studio as separate module boundaries
5. Reuse existing Workforce tenancy, RBAC, and audit/timeline patterns

## Important rules
- Do not merge these by collapsing them into one module
- Do not put raw OpenAI calls directly in Studio or Communication
- Keep provider integration in AI Gateway
- Keep Communication as thread/message infrastructure
- Keep Studio as the structured design owner

## Suggested next repo deliverables
- `AI_GATEWAY__ATOMIC_EXECUTION_PLAN.md`
- `COMMUNICATION__ATOMIC_EXECUTION_PLAN.md`
- `STUDIO_AI_INTEGRATION__BUILD_ORDER.md`
