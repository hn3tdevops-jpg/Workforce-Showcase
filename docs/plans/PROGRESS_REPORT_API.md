Progress report: RBAC integration for tasks listing (GET /hospitable/tasks)

Summary:
- File modified: artifacts/api-server/src/hospitable/router.ts
- Behavior: GET /tasks now enforces RBAC by checking the caller's local session (local_sessions.user_json) for permissions and, when needed, consulting the internal /auth/me/access-context endpoint to derive effective scopes and permissions.
- Enforcement rules applied:
  - Caller must present Authorization header.
  - If caller has '*' or 'tasks:read' permission (local override or via computed scopes), full listing within requested location is allowed.
  - If caller has BUSINESS assignment, they are allowed across business locations.
  - If caller has LOCATION-scoped assignments, listing is restricted to those locations.
  - If caller lacks tasks:read but has tasks:write:own, listing is restricted to tasks assigned to the caller's employee_profile_id(s).
  - Unauthorized or out-of-scope callers receive 401 or 403 responses.

Tests and next steps:
- No automated tests were present for the api-server package. Adding tests is the next smallest task. Recommendations:
  1. Add a test harness (Jest or Mocha) to artifacts/api-server.
  2. Add integration tests that spin up the Express app (or import routers) and assert:
     - Authorized caller with tasks:read receives tasks scoped to provided location
     - Unauthorized caller (no token) receives 401
     - Caller with wrong location scope receives 403
     - Caller with tasks:write:own sees only tasks assigned to them
  3. Wire tests into package.json scripts and run via pnpm.

Notes:
- TypeScript typecheck currently reports unrelated errors across api-server (some param types and a missing built package for @workspace/api-zod). The RBAC change is complete, but running full typecheck/build may need addressing those unrelated issues.
