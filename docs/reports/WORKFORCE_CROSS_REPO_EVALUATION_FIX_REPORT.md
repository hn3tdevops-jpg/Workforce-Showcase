# Workforce Cross-Repo Evaluation — Fix Report

**Generated:** 2026-05-03  
**Branch:** `copilot/investigate-typescript-errors-frontend`  
**Author:** Copilot Agent (automated)

---

## Summary

This report documents the fixes applied to move the Workforce Showcase repo from the previously
documented **NO-GO** frontend state toward a **locally verifiable green state**. Production
deployment is not yet attempted.

---

## Before / After TypeScript Error Count

| Scope | Before | After | Notes |
|---|---|---|---|
| `artifacts/workforce-console` (frontend) | 1 error | **0 errors** | Import path fixed |
| `artifacts/api-server` | ~19 errors | **0 errors** | Express 5 param/query typing + IIFE return type |
| `artifacts/mockup-sandbox` | 0 errors | 0 errors | Unchanged |
| `scripts` | 0 errors | 0 errors | Unchanged |
| `lib/*` (via `tsc --build`) | 0 errors | 0 errors | Unchanged |
| **Workspace total** (`pnpm run typecheck`) | **~20 errors** | **0 errors** ✅ | |

> **Note:** The evaluation report cited 32 errors. On re-run, 20 errors were observed (1 frontend
> + ~19 api-server). The discrepancy is likely due to earlier partial fixes that were already
> in the repo. All observed errors were resolved.

---

## Build Result

| Target | Command | Result |
|---|---|---|
| Frontend SPA | `pnpm --filter @workspace/workforce-console run build` | ✅ Built — `dist/public/index.html`, `assets/index-*.css`, `assets/index-*.js` |
| Workspace build | `pnpm run build` | ✅ Passes (typecheck → per-package builds) |

---

## Test Results

No existing automated test suite was found for the frontend or api-server packages. The following
validation steps were run manually:

| Test | Result |
|---|---|
| `pnpm run typecheck` (workspace) | ✅ 0 errors |
| `pnpm --filter @workspace/workforce-console run build` (no env vars) | ✅ Success |
| `pnpm --filter @workspace/workforce-console run build PORT=5000 BASE_PATH=/` | ✅ Success |
| `tsc --build` (lib declarations) | ✅ Success |
| CORS verification (live backend) | ❌ Backend unreachable from CI environment |

---

## Exact Files Changed

### 1. `artifacts/workforce-console/src/lib/api-client.ts`

**Change:** Fixed deep import path that used a non-exported subpath.

```diff
- import type { LoginRequest, SwitchBusinessRequest } from "@workspace/api-client-react/src/generated/api.schemas";
+ import type { LoginRequest, SwitchBusinessRequest } from "@workspace/api-client-react";
```

**Root cause:** `@workspace/api-client-react/package.json` only exports `"."` (→ `./src/index.ts`).
The deep path `./src/generated/api.schemas` was not listed in `exports` and is not resolvable
under `moduleResolution: "bundler"`. The index already re-exports everything from the generated
schemas, so the fix is to use the public entry point.

---

### 2. `artifacts/workforce-console/vite.config.ts`

**Change:** Made `PORT` and `BASE_PATH` environment variables non-required for production builds.

- `PORT` is now only validated during dev/preview (`pnpm dev`, `pnpm serve`). Build (`pnpm build`)
  does not throw if `PORT` is absent. Defaults to `5000`.
- `BASE_PATH` now defaults to `"/"` when not set instead of throwing.

**Before:** Both variables threw on missing value unconditionally.  
**After:** Only dev/preview requires `PORT`; `BASE_PATH` always has a default.

---

### 3. `artifacts/api-server/src/auth/router.ts`

**Change:** Added production guard to `POST /auth/reset`.

```ts
if (process.env.NODE_ENV === "production") {
  res.status(403).json({ detail: "This endpoint is not available in production." });
  return;
}
```

**Risk context:** This endpoint allows anyone to set a local credential override for any email.
It was dev-only by intent but lacked an enforcement guard.

---

### 4. `artifacts/api-server/src/hospitable/router.ts`

**Changes:**
- Added explicit `: Promise<void>` return type to the async IIFE in the `/tasks` GET handler
  to satisfy `noImplicitReturns: true`.
- Changed all `return res.xxx()` statements inside the IIFE to `res.xxx(); return;` to be
  consistent with the `void` return type contract.
- Added `as string | undefined` type assertions to `req.query.*` extractions (`location_id`,
  `status`, `room_id`, `assigned_user_id`) to address `string | ParsedQs` → `string` assignment
  errors introduced by `@types/express@5`.

---

### 5. `artifacts/api-server/src/scheduling/router.ts`

**Changes:**
- Added `as string | undefined` type assertions to `location_id` and `week_start` query param
  extractions.
- Added `const shiftId = req.params.shiftId as string` / `const userId = req.params.userId as string`
  at the top of each handler that references these params. Express 5 types `req.params` values
  as `string | string[]`; all route params are guaranteed to be `string` at runtime but the
  `@types/express@5` types changed to allow arrays.

---

### 6. `artifacts/api-server/src/studio/router.ts`

**Changes:**
- Added `const projectId = req.params.id as string` extractions in `models/derive` and `validate`
  handlers.
- Added `as string | undefined` to `typesParam` query extraction in `artifacts/generate` handler.
- Added explicit `(t: string)` type annotation to `.filter()` callback.

---

### 7. `artifacts/api-server/src/workforce/router.ts`

**Changes:**
- Added `const employeeId = req.params.id as string` in `PATCH /employees/:id` handler.
- Added `const employeeId = req.params.id as string` in lifecycle transition handlers
  (`VALID_TRANSITIONS` forEach).
- Added `const linkId = req.params.id as string` in link transition handlers
  (`LINK_TRANSITIONS` forEach).
- Added `const employeeId = req.params.id as string` in `POST /employees/:id/role-assignments`.
- Added `const assignmentId = req.params.id as string` in `DELETE /role-assignments/:id`.

---

### 8. `lib/api-spec/openapi.yaml`

**Changes:**
- Added `GET /v1/auth/me/access-context` endpoint definition with full description noting
  that upstream backend support is **unverified**.
- Added three new schemas: `EmployeeRoleAssignment`, `EmployeeScope`, `AccessContext`.
- These schemas match the actual response shape implemented in
  `artifacts/api-server/src/auth/router.ts`.

---

### 9. `artifacts/workforce-console/.env.example`

**Changes:**
- Added `PORT` (dev/preview only, defaults to 5000, not required for build).
- Added `BASE_PATH` (defaults to `/`, not required).
- Added `VITE_API_PROXY_TARGET` (optional, dev only).
- Updated comments to accurately reflect current vite.config.ts behavior.

---

### 10. `docs/ADMIN/frontend/CORS_VERIFICATION_CHECKLIST.md` (new file)

**Added:** CORS verification curl checklist with exact commands to verify OPTIONS preflight
and POST behavior for:
- `https://wf-hn3t.pythonanywhere.com` → `https://hn3t.pythonanywhere.com/api/v1/auth/login`
- `https://devhub-hn3t.pythonanywhere.com` → `https://hn3t.pythonanywhere.com/api/v1/auth/login`

---

## lib/api-client-react Declarations

**Status:** ✅ Generated declarations are available.

The `lib/api-client-react` package uses `exports: { ".": "./src/index.ts" }` (source-level
export, not a compiled-output export). TypeScript project references are configured with
`composite: true` and `emitDeclarationOnly: true`. Running `tsc --build` from the workspace
root compiles declarations into `lib/api-client-react/dist/`.

The frontend `artifacts/workforce-console/tsconfig.json` references `lib/api-client-react`
via project references. With the corrected import path (`@workspace/api-client-react` instead
of the invalid deep subpath), TypeScript resolves the types correctly.

---

## /auth/me/access-context — OpenAPI Coverage

**Status:** ✅ Now documented in `lib/api-spec/openapi.yaml`.

The endpoint is documented with:
- Full request/response schema
- Clear note that upstream backend support is unverified
- Source of truth is the local proxy implementation in `artifacts/api-server/src/auth/router.ts`

---

## CORS Verification

**Status:** ❌ **Unverified** — live backend unreachable from this CI environment.

```
curl: (0) Could not resolve host: hn3t.pythonanywhere.com
```

All verification commands are documented in `docs/ADMIN/frontend/CORS_VERIFICATION_CHECKLIST.md`.
Run those commands from a host with internet access to verify CORS configuration.

---

## Remaining Blockers Before Production

| # | Blocker | Severity | Action |
|---|---|---|---|
| 1 | CORS not verified on `hn3t.pythonanywhere.com` | 🔴 Critical | Run CORS checklist from internet-connected host; configure CORS on backend |
| 2 | `/auth/me/access-context` upstream support unverified | 🟡 High | Check if `hn3t.pythonanywhere.com` implements this endpoint; if not, document fallback |
| 3 | `workforce_token` stored in `localStorage` (XSS risk) | 🟡 High | Replace with `sessionStorage` or `httpOnly` cookies before production |
| 4 | `SILVER_SANDS_BUSINESS_ID` hardcoded in api-server | 🟡 Medium | Parameterize via env var before any multi-tenant or production deployment |
| 5 | No passing CI/CD run (GitHub Actions PAT lacks `workflow` scope) | 🟡 Medium | Provide PAT with `workflow` scope; merge browser validation workflow |
| 6 | Rollback rehearsal not completed | 🟡 Medium | Run `scripts/restore_operational_artifact.sh` against `dist-staging` |
| 7 | `hospitable.db` committed to repo | 🟡 Medium | Remove or gitignore; ensure no real data is present |
| 8 | No automated test suite for frontend or api-server | 🟡 Medium | Add unit/integration tests before production cutover |

---

## Commands Run (in order)

```bash
# 1. Install pnpm and workspace deps
npm install -g pnpm@9
pnpm install

# 2. Baseline typecheck (before fixes)
pnpm run typecheck
# → ~20 errors (1 in workforce-console, ~19 in api-server)

# 3. Apply all fixes (see Files Changed above)

# 4. Verify frontend typecheck
pnpm --filter @workspace/workforce-console run typecheck
# → 0 errors ✅

# 5. Verify api-server typecheck
pnpm --filter @workspace/api-server run typecheck
# → 0 errors ✅

# 6. Full workspace typecheck
pnpm run typecheck
# → 0 errors ✅

# 7. Frontend build (no env vars — verifies PORT/BASE_PATH are non-required)
pnpm --filter @workspace/workforce-console run build
# → ✅ dist/public/index.html, assets/*.css, assets/*.js

# 8. CORS verification (from CI environment)
curl -s --max-time 5 "https://hn3t.pythonanywhere.com/api/healthz"
# → BACKEND_UNREACHABLE (CI has no internet access to this host)
```
