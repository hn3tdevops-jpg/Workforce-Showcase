# MERGE_PATCH_PLAN__.github_copilot-instructions.md

## Purpose
Merge the planning/execution framework into `.github/copilot-instructions.md` without erasing current repository-specific coding guidance.

## Exact source file
- `.github/copilot-instructions-planning-appendix.md`

## Merge rule
Append or selectively merge the planning appendix into the existing `.github/copilot-instructions.md`.

## Do not
- delete existing build/test commands
- delete service-specific instructions
- delete tenancy/RBAC safety rules already present
- replace the entire file with the appendix

## What the appendix is meant to add
- plan-first behavior
- atomic-task execution expectations
- patch minimalism
- progress-report updates
- one-checkbox discipline
- no-scope-creep rules for plan execution

## Best insertion location
Append near the end under a heading such as:
- `## Planning and atomic execution workflow`
or
- `## Workforce planning framework appendix`

## Post-merge check
Confirm that the final `.github/copilot-instructions.md` still contains:
- repo build/test instructions
- service-specific hints
- existing architectural constraints
- the new planning appendix
