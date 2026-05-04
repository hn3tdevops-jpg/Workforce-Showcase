# Workforce Cross-Repo Evaluation Report

**Generated:** 2026-05-03  
**Coordination Hub:** `workforce-showcase`  
**Report Author:** Copilot Agent (automated analysis)

---

## Report Inventory

| Report | Status |
|---|---|
| `workforce-backup/docs/reports/REPO_EVALUATION_REPORT.md` | ⚠️ INACCESSIBLE — repo not available in this agent context |
| `workforce-showcase/docs/reports/REPO_EVALUATION_REPORT.md` | ✅ CREATED — see `docs/reports/REPO_EVALUATION_REPORT.md` (generated 2026-05-04) |
| `workforce-console/docs/reports/REPO_EVALUATION_REPORT.md` | ⚠️ INACCESSIBLE — standalone repo not available; partial data inferred from `artifacts/workforce-console` in this repo |

> **Note:** This report was authored from within `workforce-showcase`. Direct read access to `workforce-backup` and the standalone `workforce-console` repos was not available. Sections covering those repos are marked with placeholder text and must be filled in by pasting data from those repos' individual evaluation reports when available.

---

## 1. Executive Summary

### Overall System Health: 🔴 NOT PRODUCTION READY

The Workforce platform is a multi-repo system consisting of a Python/FastAPI backend (`hn3t.pythonanywhere.com`), a Node.js/Express local API proxy (`artifacts/api-server`), a React/Vite frontend SPA (`artifacts/workforce-console`), and a developer hub (`developer_hub/`). As of this evaluation:

- **Frontend (workforce-showcase):** 32 TypeScript errors remain unresolved. CI/CD (Playwright browser validation) has never successfully run on the remote. Production status is explicitly documented as `NO-GO`.
- **Backend (`hn3t.pythonanywhere.com`):** The canonical production backend is an external PythonAnywhere deployment. Its health, RBAC implementation, and API contract completeness are only partially observable from this repo. No `/api/health` or `/api/healthz` endpoint is confirmed live.
- **workforce-backup:** Inaccessible from this environment. Health unknown — placeholder below.
- **workforce-console (standalone):** Inaccessible from this environment. Partial state inferred from `artifacts/workforce-console` contents.

### Production Readiness
❌ **Not ready.** Key blockers include unresolved TypeScript errors, no passing CI/CD run, unvalidated rollback procedure, and unconfirmed backend CORS and API contract alignment.

### Top Blockers
1. 32 unresolved TypeScript errors in the frontend (type generation/lib boundary and icon prop typing)
2. GitHub Actions workflow for browser validation was never successfully pushed to remote (PAT lacks `workflow` scope)
3. No confirmed `CORS` configuration allowing `wf-hn3t.pythonanywhere.com` or `devhub-hn3t.pythonanywhere.com` to call `hn3t.pythonanywhere.com`
4. `lib/api-client-react` declaration files not built — blocking typed imports across the frontend
5. Rollback rehearsal not yet completed; archive presence and checksums unverified

### Top Risks
1. **Diverged API contract:** The OpenAPI spec in `lib/api-spec/openapi.yaml` and the running PythonAnywhere backend may have drifted — no automated contract test exists
2. **Auth token in localStorage:** `workforce_token` stored in `localStorage` is vulnerable to XSS; no `httpOnly` cookie fallback is in use
3. **Hardcoded business ID:** `biz-silver-sands` / `SILVER_SANDS_BUSINESS_ID` is hardcoded in the local API proxy
4. **No employee/user separation enforcement:** The `/auth/me/access-context` endpoint resolves employee roles locally but the upstream backend may not enforce the same scoping rules
5. **PythonAnywhere rate limits / uptime:** The system has no fallback if `hn3t.pythonanywhere.com` is unavailable

### Top Recommended Next Steps
1. Fix lib/api-client-react declaration file generation so the frontend typechecks cleanly
2. Provide a PAT with `workflow` scope and merge the Playwright CI workflow to enable automated browser validation
3. Document and verify CORS allow-list on the PythonAnywhere backend
4. Replace `localStorage` token storage with a more secure mechanism (e.g., `sessionStorage` + short expiry, or `httpOnly` cookies)
5. Run the rollback rehearsal against `dist-staging` and record results before any production cutover

---

## 2. Repo Health Matrix

| Repo | Purpose | Health | Production Readiness | Biggest Risk | Next Step |
|---|---|---|---|---|---|
| **workforce-showcase** | Full-stack showcase monorepo: frontend SPA, local API proxy, dev hub, build tooling, docs | 🟡 Partial | ❌ NO-GO (documented) | 32 TS errors; CI never ran remotely | Fix lib declaration files; run CI |
| **workforce-backup** | ⚠️ PLACEHOLDER — repo inaccessible | Unknown | Unknown | Unknown | Paste data from that repo's evaluation report |
| **workforce-console** (standalone) | ⚠️ PLACEHOLDER — repo inaccessible; `artifacts/workforce-console` in showcase appears to be a copy | Unknown | Unknown | May be diverged from showcase artifact | Paste data from that repo's evaluation report; reconcile with showcase artifact |

---

## 3. Cross-Repo Compatibility Matrix

| Compatibility Area | Status | Evidence | Risk | Required Action |
|---|---|---|---|---|
| **Backend API contracts** | 🟡 Partial | `lib/api-spec/openapi.yaml` defines auth, rooms, tasks, shifts, assignments; proxy extends with workforce, inspections, maintenance, inventory, studio, promotions, admin routes not in spec | Drift between spec and live backend | Expand OpenAPI spec to cover all proxied routes; add contract tests |
| **Frontend API clients** | 🟡 Partial | `lib/api-client-react` is the generated client; declaration files not built — 32 TS import errors in console | Frontend imports will fail type checks at build time | Build lib declarations; regenerate from spec |
| **Auth / login flow** | 🟡 Partial | Frontend POSTs `{ email, password, business_id: null }` to `/api/v1/auth/login`; spec returns `{ access_token, token_type }`; proxy also handles local credential overrides | Local overrides bypass upstream; token field name `access_token` must match across all repos | Verify all clients use `access_token`; document local override purpose |
| **`/auth/me` shape** | 🟡 Partial | Spec defines `SessionInfo`; frontend maps both flat `{ id, email }` and nested `{ user: { id, email } }` response shapes | Backend may return one shape; frontend tolerates both via `mapToSessionInfo` — but mismatch risk if backend changes | Canonicalize to one response shape; update spec |
| **User/session model** | 🟡 Partial | `SessionInfo` in spec: `id, email, memberships, active_business_id, roles, permissions`; frontend also reads `is_active, is_superadmin` which are not in spec | Fields outside spec may be missing or renamed in production | Add `is_active`, `is_superadmin` to spec or document as extensions |
| **RBAC expectations** | 🔴 Mismatch risk | Frontend checks `hasPermission("owner:*")`, `hasPermission("business:owner")`, `hasRole("owner")`, `isSuperAdmin()` via `"superadmin:*"` permission; backend RBAC implementation is unverified | Frontend RBAC checks may not match backend enforcement | Document and verify role/permission naming conventions across repos |
| **Employee/user separation** | 🟡 Partial | `/auth/me/access-context` separates user identity from employee profiles (`user_employee_links` → `employee_profiles`); employment scope fetched separately | Upstream backend may not implement `access-context` endpoint — only local proxy is confirmed | Verify upstream has `/auth/me/access-context`; document fallback behavior |
| **Business/location scoping** | 🟡 Partial | `active_business_id` in session; location assignments in `employee_role_assignments`; Vite proxy routes `/api/v1/business` to local proxy | No multi-location scoping tested end-to-end | Add integration test for location-scoped API calls |
| **Environment variables** | 🟡 Partial | `VITE_API_BASE_URL` (optional), `VITE_DEMO_MODE`, `PORT` (required), `BASE_PATH` (required), `VITE_API_PROXY_TARGET`; `.env.production` sets `VITE_API_BASE_URL=https://hn3t.pythonanywhere.com` | `PORT` and `BASE_PATH` required by vite.config.ts — missing in production env would fail build | Document all required env vars in a single `.env.example` at repo root; verify CI sets them |
| **Deployment domains** | 🟡 Partial | `hn3t.pythonanywhere.com` (backend/prod), `wf-hn3t.pythonanywhere.com` (frontend?), `devhub-hn3t.pythonanywhere.com` (dev hub?) | Domain-to-app mapping not formally documented; CORS not confirmed for all combinations | Create a deployment topology document; verify CORS headers on each domain |
| **Build systems** | 🟡 Partial | workforce-showcase: pnpm + Vite + TypeScript project references; api-server: Node.js/ESM; workforce-backup/console standalone: UNKNOWN | Build config divergence could cause different output formats or missing assets | Standardize build process documentation across repos |
| **Generated types/schemas** | 🔴 Broken | `lib/api-client-react` generated from `lib/api-spec/openapi.yaml` via orval; declaration files not built; 32 TS errors result | Frontend type safety is compromised | Fix generation pipeline; commit generated declarations or build in CI |
| **CI/CD** | 🔴 Broken | `.github/workflows/playwright-browser-validation.yml` prepared but never pushed to remote (PAT lacked `workflow` scope); no CI runs have passed | No automated quality gate exists | Resolve PAT permissions; push workflow; verify run passes |
| **Docs / devhub / showcase links** | 🟡 Partial | `developer_hub/index.html` present; `docs/ADMIN/frontend/` has operational runbooks; `docs/planning/` has templates; cross-repo links reference `/home/hn3t/workforce/` absolute paths which don't exist in this environment | Docs reference machine-local absolute paths; broken in any other environment | Replace absolute paths with repo-relative paths or GitHub URLs |

---

## 4. Backend / Frontend Contract Alignment

### Login Endpoint (`POST /api/v1/auth/login`)

| Aspect | OpenAPI Spec | Frontend Assumption | API Proxy Behavior | Status |
|---|---|---|---|---|
| Request body | `{ email, password }` | `{ email, password, business_id: null }` | Passes body through to upstream or local override | 🟡 Mismatch: `business_id` field sent but not in spec |
| Success response | `{ access_token, token_type }` | Reads `access_token`; ignores `business_id`, `user` if present | Returns `{ access_token, token_type: "bearer" }` from local override | ✅ Aligned |
| Error response | `{ detail: string }` with HTTP 401 | Reads `errorData.detail` or `errorData.message` | Returns `{ detail }` for local errors | ✅ Aligned |

### `/auth/me` Endpoint (`GET /api/v1/auth/me`)

| Aspect | OpenAPI Spec | Frontend Assumption | API Proxy Behavior | Status |
|---|---|---|---|---|
| Response shape | `SessionInfo`: `{ id, email, memberships[], active_business_id?, roles?, permissions? }` | Tolerates both flat `{ id, email }` and nested `{ user: { id, email } }` | Returns flat user JSON from local session | 🟡 Frontend handles both but spec only defines flat |
| `is_active` field | Not in spec | Read from `data.user?.is_active` | Present in local user JSON (`buildMinimalUser`) | ⚠️ Unknown: may or may not be in upstream response |
| `is_superadmin` field | Not in spec | Read from `data.user?.is_superadmin` | Not set in `buildMinimalUser` | ⚠️ Unknown: may or may not be in upstream response |

### `/auth/me/access-context` Endpoint

| Aspect | OpenAPI Spec | Frontend Assumption | API Proxy Behavior | Status |
|---|---|---|---|---|
| Endpoint existence | Not in spec | Called after `/auth/me`; failure silently caught | Implemented in local proxy via SQLite queries | 🔴 Not in spec; upstream support unverified |
| Response shape | Not in spec | `{ user_id, has_access, active_scope_count, scopes[] }` | Returns structured scopes from local DB | ⚠️ Unknown for upstream |

### Registration / Create-User

| Aspect | Status |
|---|---|
| Registration endpoint | ❌ Not in OpenAPI spec; not found in frontend; local reset endpoint (`POST /auth/reset`) provides credential override only |
| User creation flow | ⚠️ Unknown — presumably handled by upstream backend outside this repo |

### Employee/User Linking

| Aspect | Status |
|---|---|
| `user_employee_links` table | ✅ Present in local SQLite DB via `artifacts/api-server` |
| Frontend consumption | ✅ `EmploymentScope` interface defined; `employmentScope` stored in auth context |
| Upstream backend support | ⚠️ UNKNOWN — verify `wf-hn3t.pythonanywhere.com` or `hn3t.pythonanywhere.com` implements this |

### Business/Location Scoping

| Aspect | Status |
|---|---|
| `active_business_id` in session | ✅ In spec and frontend |
| Location-scoped resource queries | 🟡 Present in employee_role_assignments locally; not verified for upstream |
| Multi-business switching | ✅ `/auth/switch-business` in spec; implemented in frontend and proxy passes to upstream |

### Role/Permission Naming Conventions

| Convention | Evidence | Status |
|---|---|---|
| `"owner:*"` permission string | Used in `hasPermission` | ⚠️ Not in spec; assumed upstream convention |
| `"business:owner"` permission string | Used in `hasPermission` | ⚠️ Not in spec |
| `"superadmin:*"` permission string | Used in `isSuperAdmin()` | ⚠️ Not in spec |
| `roles` array with lowercase role names | Used in `hasRole()` | 🟡 Spec defines `roles: string[]` without enumerating values |

### Error Response Shape

| Aspect | OpenAPI Spec | Frontend Assumption | Status |
|---|---|---|
| Error body | `{ detail: string }` | Reads `errorData.detail \|\| errorData.message` | ✅ Aligned (frontend handles both gracefully) |
| HTTP status codes | 401 for auth, 422 for validation | `ApiError` captures `.status` | ✅ Aligned |

### CORS / Frontend Origin Assumptions

| Aspect | Evidence | Status |
|---|---|---|
| Dev CORS | Vite proxy forwards `/api/v1` → `hn3t.pythonanywhere.com` — no CORS needed in dev | ✅ OK for development |
| Production CORS | `.env.production` sets `VITE_API_BASE_URL=https://hn3t.pythonanywhere.com`; frontend will make cross-origin requests | 🔴 Backend must have CORS header allowing the production frontend origin |
| PythonAnywhere CORS config | Not observable from this repo | ⚠️ Must be verified on backend |

### Required Contract Specifications (Currently Missing)

1. Canonical response shape for `/auth/me` (flat vs nested)
2. Canonical permission string format (`owner:*`, `business:owner`, `superadmin:*`)
3. Formal spec for `/auth/me/access-context`
4. Spec for all routes proxied by api-server but absent from `openapi.yaml`: `/workforce`, `/inspections`, `/maintenance`, `/inventory`, `/studio`, `/promotions`, `/admin`, `/notifications`, `/business`, `/hospitable`
5. Registration/create-user endpoint spec
6. CORS policy documentation for all deployment domains

---

## 5. Deployment Readiness Matrix

| Component | Domain/Target | Build/Runtime | Env Vars | Health Check | Status | Blockers |
|---|---|---|---|---|---|---|
| **Frontend SPA** (workforce-console) | `https://wf-hn3t.pythonanywhere.com` (assumed) | Vite build → `dist/public`; served by Flask `app.py` | `PORT` ✅ required, `BASE_PATH` ✅ required, `VITE_API_BASE_URL` ✅ set in `.env.production` | None (SPA, no `/healthz`) | ❌ NO-GO | 32 TS errors; CI never passed; Playwright validation blocked |
| **Local API Proxy** (api-server) | `localhost:8080` (dev only) | Node.js/ESM; `npm run dev` / `node dist/index.js` | None documented | None | 🟡 Dev-only; not deployed to PythonAnywhere | No production deployment target documented |
| **Backend API** (upstream) | `https://hn3t.pythonanywhere.com` | Python/FastAPI (assumed) on PythonAnywhere | Unknown from this repo | `/api/healthz` defined in spec but not confirmed live | ⚠️ Unknown | Health check not verified; CORS not confirmed |
| **Developer Hub** | `https://devhub-hn3t.pythonanywhere.com` (assumed) | Static HTML (`developer_hub/index.html`) | None | None | ⚠️ Unknown | Domain mapping not confirmed in this repo |
| **Database** (SQLite) | `hospitable.db` in repo root | SQLite via Drizzle ORM (`lib/db`) | None | None | ⚠️ Dev/local only | `hospitable.db` committed to repo (security risk — may contain real data) |

---

## 6. Security / RBAC / Data Integrity Summary

### Authentication
- **Token storage:** `workforce_token` stored in `localStorage`. This is XSS-vulnerable. No `httpOnly` cookie alternative is in use.  
- **Token type:** UUID (not JWT) for local sessions; upstream may return a different token format.
- **Local credential override:** `POST /auth/reset` creates local DB overrides — intended for dev, but if the api-server is accessible on a deployed host, this endpoint allows anyone to set a password for any email.

### RBAC
- Permission strings (`owner:*`, `business:owner`, `superadmin:*`) are assumed conventions not formally specified. Frontend enforces them client-side; server-side enforcement is unverified from this repo.
- Employee permission checks (`hasEmployeePermission`) use a separate `effectivePermissions` array from the access-context endpoint. This separation is architecturally sound but only implemented locally.
- No role hierarchy is documented. Overlap between `hasRole("owner")`, `hasPermission("owner:*")`, and `isMember(role="owner")` creates potential gaps.

### Tenant/Business/Location Scoping
- `active_business_id` is in the session and enforced (assumed) by the upstream backend.
- Location scoping via `employee_role_assignments` is implemented locally; upstream enforcement is unverified.
- `SILVER_SANDS_BUSINESS_ID = "biz-silver-sands"` is hardcoded in the local proxy — must not reach production without parameterization.

### User/Employee Separation
- Architecturally correct: `user_employee_links` table separates identity (users) from employment (employee profiles).
- Frontend correctly fetches employment scope separately and exposes it as `employmentScope`.
- Risk: if a user has no employee profile, `employmentScope` is null and `hasEmployeePermission` always returns false — this could silently deny access.

### Admin Tooling
- `/api/v1/admin` routes exist in the Vite proxy config targeting `localhost:8080`; admin route implementation in `artifacts/api-server/src/admin` is not reviewed here.
- No admin authentication guard is confirmed beyond the standard Bearer token check.

### CORS
- Dev: Vite proxy avoids CORS. ✅
- Production: Frontend calls `hn3t.pythonanywhere.com` directly. CORS must be configured. **Not confirmed.** 🔴

### Secrets
- `hospitable.db` (SQLite) is committed to the repo root — if it contains real user/business data, this is a data exposure risk.
- `.env.production` contains the production API URL in plain text — acceptable, but should be reviewed if it ever contains tokens.
- No secrets were observed hardcoded in source code beyond the `biz-silver-sands` business ID.

### Deployment Config
- `BASE_PATH` and `PORT` are required at build time. If not set in CI/deployment, the build throws immediately.
- `VITE_API_PROXY_TARGET` defaults to `https://hn3t.pythonanywhere.com` — acceptable for dev.

### Generated Files
- `lib/api-client-react` contains generated TypeScript from the OpenAPI spec. Declaration files are not being built, causing 32 type errors. Generated files should not be manually edited.

### Public/Private Boundary
- The developer hub (`developer_hub/`) appears to be a public-facing static page. If it links to internal API endpoints or credential reset pages, this should be reviewed.
- The API proxy's local reset endpoint (`POST /auth/reset`) must never be deployed to a production-accessible host without authentication.

---

## 7. Documentation / Source-of-Truth Summary

### Best Source-of-Truth Docs

| Document | Location | Purpose |
|---|---|---|
| OpenAPI Spec | `lib/api-spec/openapi.yaml` | API contract definition — authoritative for generated types |
| QA Cutover Plan | `docs/ADMIN/frontend/QA-cutover-plan.md` | Pre-production validation checklist |
| Frontend Progress Report | `docs/ADMIN/frontend/PROGRESS_REPORT_FRONTEND.md` | Current execution status and NO-GO record |
| Backend API Contract | `docs/ADMIN/frontend/workforce-project-manager-module/docs/BACKEND_API_CONTRACT.md` | Project manager module API |

### Stale / At-Risk Docs

| Document | Issue |
|---|---|
| `docs/plans/HN3T_MASTER_PLAN.md` | Points to `/home/hn3t/workforce/HN3T_MASTER_PLAN.md` — machine-local absolute path that doesn't exist in this environment |
| `.copilot_frontend/state.json` | References `active_repo: /home/hn3t/workforce_frontend_app` — machine-local path |
| `docs/ADMIN/frontend/QA-cutover-plan.md` | References `/home/hn3t/workforce_frontend_app/...` paths throughout — will be invalid outside original host |
| `route-validation-summary.md` (repo root) | Appears to be a generated artifact committed to repo root — consider moving to `docs/` or `docs/ADMIN/frontend/artifact-diffs/` |

### Missing Docs

| Missing Document | Why Needed |
|---|---|
| Deployment topology map | No single document maps each domain to its serving application |
| CORS policy specification | Required before any production deployment |
| Permission/role naming conventions | Required to verify frontend ↔ backend RBAC alignment |
| Env var reference | No root-level `.env.example` consolidating all required vars across packages |
| `workforce-backup` evaluation report | Not present; repo not accessible |
| `workforce-console` standalone evaluation report | Not present in this repo |

### Duplicated Docs
- `route-validation-summary.md` exists both at repo root and in `docs/ADMIN/frontend/artifact-diffs/` — root copy should be removed or symlinked.

### Docs to Surface in Showcase/Devhub
- `docs/ADMIN/frontend/PROGRESS_REPORT_FRONTEND.md` — production readiness status
- `docs/ADMIN/frontend/QA-cutover-plan.md` — deployment gate checklist
- `lib/api-spec/openapi.yaml` — served as interactive API docs (Swagger UI/Redoc)

### Docs to Archive
- `docs/ADMIN/frontend/CI_TRIGGER_ATTEMPT.md` — recording of a failed push; useful for history, but should be archived in `docs/ADMIN/frontend/archive/` to reduce noise
- Machine-path references in master plan files — replace or archive

---

## 8. Top 10 Risks

| Rank | Risk | Repos Affected | Severity | Evidence | Recommended Fix |
|---|---|---|---|---|---|
| 1 | **lib/api-client-react declarations not built** — 32 TypeScript errors prevent a clean typecheck/build | workforce-showcase | 🔴 High | `PROGRESS_REPORT_FRONTEND.md`: "imports from lib/api-client-react are failing because the lib's declaration files were not built" | Run `pnpm --filter @workspace/api-client-react run build` in CI; commit output or add to build pipeline |
| 2 | **No passing CI run** — browser validation workflow was never successfully pushed to remote | workforce-showcase | 🔴 High | `PROGRESS_REPORT_FRONTEND.md`: "refusing to allow a Personal Access Token to create or update workflow without `workflow` scope" | Grant `workflow` scope to PAT; push and run the workflow |
| 3 | **Unverified CORS on production backend** — frontend in production mode calls `hn3t.pythonanywhere.com` cross-origin | workforce-showcase, workforce-console | 🔴 High | `.env.production` sets `VITE_API_BASE_URL=https://hn3t.pythonanywhere.com`; no CORS config visible from this repo | Verify `Access-Control-Allow-Origin` on backend; document allowed origins |
| 4 | **`localStorage` token storage** — XSS attack could exfiltrate `workforce_token` | workforce-showcase, workforce-console | 🔴 High | `api-client.ts`: `localStorage.getItem("workforce_token")`; `auth-context.tsx`: `localStorage.setItem("workforce_token", ...)` | Migrate to `sessionStorage` with short-lived tokens or `httpOnly` cookies |
| 5 | **`hospitable.db` committed to repo** — SQLite database with potentially real business data is tracked in git | workforce-showcase | 🔴 High | `hospitable.db`, `hospitable.db-shm`, `hospitable.db-wal` in repo root; not in `.gitignore` for data files | Add `*.db`, `*.db-shm`, `*.db-wal` to `.gitignore`; purge from git history if real data present |
| 6 | **Hardcoded `SILVER_SANDS_BUSINESS_ID`** — business ID hardcoded in local API proxy | workforce-showcase | 🟡 Medium | `artifacts/api-server/src/auth/router.ts`: `const SILVER_SANDS_BUSINESS_ID = "biz-silver-sands"` | Parameterize via environment variable; document dev-only purpose |
| 7 | **Unauthenticated `/auth/reset` endpoint** — anyone can set credentials for any email if api-server is reachable | workforce-showcase | 🟡 Medium | `artifacts/api-server/src/auth/router.ts`: `router.post("/reset", ...)` with no auth guard | Gate this endpoint behind a strong secret or remove from non-dev builds |
| 8 | **API contract drift** — many proxied routes (`/workforce`, `/inspections`, etc.) are not in the OpenAPI spec | workforce-showcase | 🟡 Medium | `vite.config.ts` proxy entries vs `lib/api-spec/openapi.yaml` paths | Expand OpenAPI spec; add contract tests |
| 9 | **workforce-backup and workforce-console standalone states unknown** — cannot assess compatibility or health without access | All repos | 🟡 Medium | These repos are inaccessible in this agent session | Access each repo individually and produce evaluation reports; reconcile with this document |
| 10 | **Machine-local absolute paths in docs** — docs reference `/home/hn3t/...` paths that break in any other environment | workforce-showcase | 🟢 Low | `docs/plans/HN3T_MASTER_PLAN.md`, `.copilot_frontend/state.json`, `docs/ADMIN/frontend/QA-cutover-plan.md` | Replace all absolute paths with repo-relative paths or GitHub permalink URLs |

---

## 9. Top 10 Recommended Next Actions

| Rank | Priority | Repo | Task | Why It Matters |
|---|---|---|---|---|
| 1 | 🔴 Critical | workforce-showcase | Build `lib/api-client-react` declaration files and fix TypeScript errors (target: 0 errors) | Prerequisite for a clean build and any production deployment |
| 2 | 🔴 Critical | workforce-showcase | Grant `workflow` scope to PAT; push Playwright CI workflow; run and pass first CI validation | Without passing CI, there is no automated quality gate — production is gated on this |
| 3 | 🔴 Critical | workforce-showcase | Verify and document CORS configuration on `hn3t.pythonanywhere.com` | Production frontend makes cross-origin requests that will fail without CORS headers |
| 4 | 🔴 Critical | workforce-showcase | Remove `hospitable.db*` from git tracking; add to `.gitignore`; audit for real data exposure | Database file committed to repo is a data integrity and privacy risk |
| 5 | 🔴 Critical | All repos | Access `workforce-backup` and standalone `workforce-console` repos; produce individual evaluation reports; paste findings into this document | Cross-repo evaluation is incomplete without those repos' data |
| 6 | 🟡 High | workforce-showcase | Complete rollback rehearsal against `dist-staging` using `scripts/restore_operational_artifact.sh` | Rollback must be validated before any production cutover |
| 7 | 🟡 High | workforce-showcase | Expand `lib/api-spec/openapi.yaml` to cover all proxied routes | Missing spec sections mean no type safety or contract tests for large portions of the API surface |
| 8 | 🟡 High | workforce-showcase | Migrate `workforce_token` from `localStorage` to a more secure storage mechanism | Token exposure via XSS is a significant auth security risk |
| 9 | 🟡 High | workforce-showcase | Gate `/auth/reset` endpoint behind authentication or remove from non-dev builds | Unauthenticated credential override is dangerous if api-server reaches production |
| 10 | 🟢 Medium | workforce-showcase | Replace all machine-local absolute paths in docs with repo-relative paths | Docs must be usable in any environment, including CI runners and new developer machines |

---

## Appendix: Repository Structure Summary (workforce-showcase)

```
workforce-showcase/
├── app.py                          # Flask SPA fallback server
├── .env.production                 # Production env: VITE_API_BASE_URL
├── hospitable.db                   # ⚠️ SQLite DB committed to repo
├── artifacts/
│   ├── api-server/                 # Local Node.js/Express API proxy
│   │   └── src/auth/router.ts      # Auth proxy + local credential override
│   └── workforce-console/          # Frontend SPA (React + Vite)
│       ├── src/lib/api-client.ts   # HTTP client; reads localStorage token
│       ├── src/lib/auth-context.tsx # AuthProvider + session management
│       └── vite.config.ts          # Build config; requires PORT + BASE_PATH
├── lib/
│   ├── api-spec/openapi.yaml       # OpenAPI 3.1 spec (partial coverage)
│   ├── api-client-react/           # Generated TypeScript client (declarations not built)
│   ├── api-zod/                    # Generated Zod schemas
│   └── db/                         # Drizzle ORM schema + migrations
├── developer_hub/                  # Static HTML dev hub
├── docs/
│   ├── ADMIN/frontend/             # Operational runbooks, progress report, cutover plan
│   ├── planning/                   # Templates and planning docs
│   └── plans/                      # Execution pointers
└── dist/                           # Built SPA output (not in repo; produced at build time)
```

---

*This report was generated by automated analysis of the `workforce-showcase` repository. Sections for `workforce-backup` and standalone `workforce-console` are placeholders that must be populated from those repos' individual evaluation reports.*
