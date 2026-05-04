# Workforce Cross-Repo Evaluation Report

**Generated:** 2026-05-04  
**Updated:** 2026-05-04 (added evidence from workforce-backup and workforce-console via GitHub API)  
**Coordination Hub:** `workforce-showcase`  
**Report Author:** Copilot Agent (automated analysis)

---

## Report Inventory

| Report | Status |
|---|---|
| `workforce-backup/docs/reports/REPO_EVALUATION_REPORT.md` | ❌ MISSING — repo is accessible via GitHub API; individual evaluation report has not been created yet (see source issue: [Workforce-backup#19](https://github.com/hn3tdevops-jpg/Workforce-backup/issues/19)) |
| `workforce-showcase/docs/reports/REPO_EVALUATION_REPORT.md` | ✅ EXISTS — see `docs/reports/REPO_EVALUATION_REPORT.md` (generated 2026-05-04, branch `copilot/create-evaluation-report-again`) |
| `workforce-console/docs/reports/REPO_EVALUATION_REPORT.md` | ❌ MISSING — repo is accessible via GitHub API; no `docs/reports/` directory exists; individual evaluation report has not been created yet (see source issue: [Workforce-Console#18](https://github.com/hn3tdevops-jpg/Workforce-Console/issues/18)) |

> **Note:** All three repos were accessed via GitHub API for this report. Key docs from workforce-backup and workforce-console were read to populate sections below. Where a fact is read directly from a file in those repos, the source path is noted as evidence. Sections that remain unresolvable from remote file reads are explicitly marked `[NEEDS VERIFICATION]`.

---

## 1. Executive Summary

### Overall System Health: 🔴 NOT PRODUCTION READY

The Workforce platform spans three repositories with distinct roles:

- **workforce-backup** (`hn3tdevops-jpg/Workforce-backup`): Python/FastAPI multi-tenant platform backend. In Phase 0 — Foundation Freeze. Tests passing (53 as of 2026-05-03), CI workflows now added and fixed, CORS partially corrected for Render frontend (`https://hospitable-web.onrender.com`). PostgreSQL migration chain not yet verified. No individual `REPO_EVALUATION_REPORT.md`.
- **workforce-console** (`hn3tdevops-jpg/Workforce-Console`): Mixed repository containing both a FastAPI backend (`workforce_api/`) and a React/Vite frontend (`workforce_frontend_app/`). POST `/api/v1/auth/login` was returning HTTP 500 in production (now returns 503 on unhandled exceptions). GET `/api/v1/bootstrap` confirmed working. No CI. No individual `REPO_EVALUATION_REPORT.md`.
- **workforce-showcase** (`hn3tdevops-jpg/Workforce-Showcase`): Full-stack showcase monorepo: frontend SPA, local Node.js/Express API proxy, Flask SPA server, dev hub, build tooling, docs. 32 TypeScript errors unresolved. CI/CD (Playwright browser validation) never successfully ran on the remote. Production status explicitly documented as `NO-GO`. Hosts the individual `REPO_EVALUATION_REPORT.md` and this cross-repo report.

### Production Readiness
❌ **Not ready for any repo.** Key blockers include unresolved TypeScript errors in the frontend, a broken login endpoint in workforce-console, CORS not fully verified for PythonAnywhere-hosted services, no passing CI/CD run in showcase, unverified PostgreSQL migration chain in backup.

### Top Blockers
1. 32 unresolved TypeScript errors in workforce-showcase frontend (type generation/lib boundary and icon prop typing)
2. GitHub Actions workflow for browser validation was never successfully pushed to remote in workforce-showcase (PAT lacks `workflow` scope)
3. POST `/api/v1/auth/login` returned HTTP 500 in production in workforce-console (root cause: DB/migrations not provisioned; now returns 503 on error — full fix requires running `alembic upgrade head` + seeding DB on production)
4. PostgreSQL migration chain unverified in workforce-backup — only SQLite verified locally; `foundation-v0.1` tag not yet cut
5. CORS configuration for PythonAnywhere origins (`wf-hn3t.pythonanywhere.com`, `hn3t.pythonanywhere.com`) not confirmed in any backend; workforce-backup only added `https://hospitable-web.onrender.com`

### Top Risks
1. **Diverged API contracts across repos:** OpenAPI spec in workforce-showcase (`lib/api-spec/openapi.yaml`) is not the same spec as workforce-console's backend (`workforce_api/`); no shared contract enforcement
2. **Auth token in localStorage:** `workforce_token` stored in `localStorage` (workforce-showcase and workforce-console frontend) is vulnerable to XSS
3. **Dual RBAC schemas:** workforce-backup has canonical RBAC (`memberships/roles/role_permissions/permissions/scoped_role_assignments`) AND a legacy frozen surface (`biz_roles/biz_role_permissions/membership_roles`) — `SKIP_WORKFORCE_MODELS=1` guard required at all times; if guard fails, double-registration causes boot failure
4. **`hospitable.db` committed to workforce-showcase repo** — SQLite database with potentially real business data tracked in git
5. **Login 500 in workforce-console production** — users cannot authenticate against the live workforce-console backend without running DB migrations and seed

### Top Recommended Next Steps
1. Create individual `REPO_EVALUATION_REPORT.md` in workforce-backup and workforce-console per their respective issues (#19, #18)
2. Verify and document CORS allow-list for all PythonAnywhere-hosted origins in workforce-backup (`hn3t.pythonanywhere.com`)
3. Fix lib/api-client-react declaration file generation in workforce-showcase so the frontend typechecks cleanly
4. Run `alembic upgrade head` + seed DB on workforce-console production to fix the login 500
5. Verify PostgreSQL migration chain in workforce-backup and cut `foundation-v0.1` tag

---

## 2. Repo Health Matrix

| Repo | Purpose | Health | Production Readiness | Biggest Risk | Next Step |
|---|---|---|---|---|---|
| **workforce-backup** | Python/FastAPI multi-tenant platform backend; platform core for scheduling, RBAC, tenancy | 🟡 Partial | ❌ NO-GO (Phase 0 unfinished; PostgreSQL migration unverified; no `foundation-v0.1` tag) | Dual RBAC schema (`SKIP_WORKFORCE_MODELS=1` guard); PostgreSQL migration unverified | Cut `foundation-v0.1` tag after verifying Alembic migration on PostgreSQL; create `REPO_EVALUATION_REPORT.md` |
| **workforce-showcase** | Full-stack showcase monorepo: frontend SPA, local API proxy, dev hub, build tooling, docs | 🟡 Partial | ❌ NO-GO (documented explicitly) | 32 TS errors; CI never ran on remote; `hospitable.db` committed | Fix lib declaration files; grant PAT `workflow` scope; run CI |
| **workforce-console** | Mixed frontend+backend repo: FastAPI backend (`workforce_api/`) + React/Vite SPA (`workforce_frontend_app/`) | 🔴 Degraded | ❌ NO-GO (login returning 500/503 in production) | Login 500 due to unprovisioned DB; unclear deployment topology; no CI | Run `alembic upgrade head` + seed on production DB; create `REPO_EVALUATION_REPORT.md` |

---

## 3. Cross-Repo Compatibility Matrix

| Compatibility Area | Status | Evidence | Risk | Required Action |
|---|---|---|---|---|
| **Backend API contracts** | 🔴 Mismatch risk | workforce-showcase has `lib/api-spec/openapi.yaml` (partial); workforce-console has `workforce_api/apps/api/` FastAPI backend with its own routes; no shared OpenAPI spec between the two backends | Two separate backends serving the same frontend clients — contracts may differ silently | Publish a canonical shared OpenAPI spec; align both backends to it |
| **Frontend API clients** | 🟡 Partial | workforce-showcase: `lib/api-client-react` (generated from spec, declarations not built — 32 TS errors); workforce-console: `workforce_frontend_app/` uses direct HTTP calls to `workforce_api/` | Frontend imports will fail type checks in showcase; console frontend client alignment unknown | Build showcase lib declarations; verify console frontend uses typed client |
| **Auth / login flow** | 🔴 Broken (console) | workforce-showcase frontend POSTs `{ email, password, business_id: null }` to `/api/v1/auth/login`; workforce-console backend login was returning 500 (now 503 on error); full fix requires DB migration + seed | Users cannot authenticate to workforce-console production | Run `alembic upgrade head` + seed; fix login endpoint; verify response contract matches frontend expectation |
| **`/api/v1/bootstrap` endpoint** | 🟡 Partial | workforce-console backend: GET `/api/v1/bootstrap` confirmed returning 200 JSON `{user, businesses, locations, roles, features}` (`CURRENT_STATE.md`, 2026-04-18); not present in workforce-showcase OpenAPI spec | Bootstrap contract implemented in console but absent from showcase spec — clients may expect different shapes | Add bootstrap contract to shared spec; verify showcase frontend consumes it |
| **`/auth/me` shape** | 🟡 Partial | workforce-showcase spec defines `SessionInfo`: `{ id, email, memberships[], active_business_id?, roles?, permissions? }`; frontend tolerates both flat and nested shapes; workforce-console backend shape unknown | Backend may return different shapes across repos | Canonicalize to one response shape; update spec in both repos |
| **User/session model** | 🟡 Partial | workforce-showcase frontend reads `is_active`, `is_superadmin` not in spec; workforce-console has `workforce_api/apps/api/app/models/user_employee_link.py` (candidate employee link model) | Fields not in spec; employee model exists in console but migration/verification status unknown | Add `is_active`, `is_superadmin` to spec; verify employee link model migration in console |
| **RBAC expectations** | 🔴 Mismatch risk | workforce-showcase frontend checks `hasPermission("owner:*")`, `hasPermission("business:owner")`, `isSuperAdmin()` via `"superadmin:*"`; workforce-backup canonical RBAC uses `atomic permission codes` (e.g., `schedule:read`) per `DECISIONS.md` D-0011; permission string formats differ | Frontend RBAC checks will not match backup's atomic permission code model | Publish canonical permission string format; update frontend to match backup's model |
| **Employee/user separation** | 🟡 Partial | workforce-backup DECISIONS.md D-0011: `ScopedRoleAssignment` links `Role` to `Membership` (user↔business), optionally scoped to `Location`; workforce-console has candidate `employee.py` + `user_employee_link.py` models [NEEDS VERIFICATION]; workforce-showcase proxies `/auth/me/access-context` locally | All three have partial implementations; no end-to-end test | Define shared employee/user link spec; test across repos |
| **Business/location scoping** | 🟡 Partial | workforce-backup D-0011: `ScopedRoleAssignment.location_id` NULL = business-wide; workforce-showcase: `active_business_id` in session + `employee_role_assignments`; workforce-console: `GET /api/v1/bootstrap` returns `{businesses, locations}` | Scoping model exists in all repos but implementations may differ | Align scoping model; document the canonical shape |
| **Environment variables** | 🟡 Partial | workforce-showcase: `VITE_API_BASE_URL=https://hn3t.pythonanywhere.com` in `.env.production`; `PORT` and `BASE_PATH` required; workforce-backup: `SKIP_WORKFORCE_MODELS=1` required; workforce-console: PYTHONPATH, DB URL, deployment vars unclear | Missing required env vars cause boot failures | Create `.env.example` per repo; document all required vars |
| **Deployment domains** | 🔴 Unclear | workforce-showcase: `hn3t.pythonanywhere.com` (backend), `wf-hn3t.pythonanywhere.com` (frontend?), `devhub-hn3t.pythonanywhere.com` (dev hub?); workforce-backup CORS allowlist adds `https://hospitable-web.onrender.com` (Render frontend); PythonAnywhere vs Render mismatch | Two deployment targets (PythonAnywhere and Render) referenced across repos — unclear which is canonical | Create a deployment topology document mapping each domain/host to its serving app |
| **Build systems** | 🟡 Partial | workforce-showcase: pnpm + Vite + TypeScript project references; workforce-backup: Poetry + pytest; workforce-console: Poetry (backend) + Vite (frontend) | Heterogeneous build systems; no unified CI across repos | Document per-repo build commands; add CI to workforce-console |
| **Generated types/schemas** | 🔴 Broken (showcase) | workforce-showcase: `lib/api-client-react` generated via orval from `lib/api-spec/openapi.yaml`; declaration files not built; 32 TS errors | Frontend type safety compromised in showcase | Fix generation pipeline; commit generated declarations or build in CI |
| **CI/CD** | 🔴 Broken (showcase); 🟡 Fixed (backup); ❌ Missing (console) | workforce-showcase: workflow never pushed (PAT scope); workforce-backup: `.github/workflows/ci.yml` and `backend-ci.yml` added and fixed (2026-05-03 WORKLOG); workforce-console: no CI workflows visible | No automated quality gate in showcase or console | Add CI to all repos; verify passing runs |
| **Docs / devhub / showcase links** | 🟡 Partial | workforce-showcase: `developer_hub/index.html` present; cross-repo docs reference `/home/hn3t/...` absolute paths; workforce-console: `docs/00_START_HERE/` has structured docs; workforce-backup: `docs/` has architecture, decisions, roadmap | Machine-local paths break in CI and other environments | Replace absolute paths with repo-relative paths or GitHub URLs |

---

## 4. Backend / Frontend Contract Alignment

### Login Endpoint (`POST /api/v1/auth/login`)

| Aspect | OpenAPI Spec (showcase) | Frontend Assumption (showcase) | workforce-console Backend | Status |
|---|---|---|---|---|
| Request body | `{ email, password }` | `{ email, password, business_id: null }` | Endpoint implemented; was returning 500 in production (PROGRESS_REPORT.md 2026-04-18) | 🔴 Console backend broken in production; `business_id` field sent but not in spec |
| Success response | `{ access_token, token_type }` | Reads `access_token` | Unknown — depends on DB returning user record | 🟡 Assumed aligned when functional |
| Error response | `{ detail: string }` with HTTP 401 | Reads `errorData.detail \|\| errorData.message` | Returns 503 on unhandled exceptions (PROGRESS_REPORT.md: "login endpoint now returns 503 Service Unavailable on unexpected errors") | ⚠️ 503 is not 401 — frontend may not handle 503 gracefully |

### `/api/v1/bootstrap` Endpoint (`GET /api/v1/bootstrap`)

| Aspect | OpenAPI Spec (showcase) | workforce-console Backend | Status |
|---|---|---|---|
| Endpoint existence | ❌ Not in showcase OpenAPI spec | ✅ Confirmed (CURRENT_STATE.md 2026-04-18): returns 200 `{user, businesses, locations, roles, features}` | 🔴 Not in spec; no shared contract |
| Frontend consumer | Showcase frontend does not call `/api/v1/bootstrap` | Console frontend: `auth-context.tsx` uses GET `/api/v1/bootstrap` when no token | ⚠️ Different bootstrap strategies across frontends |

### `/auth/me` Endpoint (`GET /api/v1/auth/me`)

| Aspect | OpenAPI Spec (showcase) | Frontend Assumption (showcase) | workforce-console Backend | Status |
|---|---|---|---|---|
| Response shape | `SessionInfo`: `{ id, email, memberships[], active_business_id?, roles?, permissions? }` | Tolerates both flat `{ id, email }` and nested `{ user: { id, email } }` | Unknown — not observable via remote file read | ⚠️ Cannot verify without running console backend |
| `is_active` field | Not in spec | Read from `data.user?.is_active` | Unknown | ⚠️ Unknown |
| `is_superadmin` field | Not in spec | Read from `data.user?.is_superadmin` | Unknown | ⚠️ Unknown |

### Registration / Create-User

| Aspect | Status |
|---|---|
| Registration endpoint (showcase) | ❌ Not in showcase OpenAPI spec; not in showcase frontend; local `/auth/reset` provides credential override only |
| Registration endpoint (console) | ✅ `POST /api/v1/auth/register` added (PROGRESS_REPORT.md: "branch fix/add-register-endpoint commit 40b0726"); tests added in `tests/test_auth_endpoints.py` |
| Cross-repo alignment | 🔴 Mismatch: console has `/auth/register`; showcase spec/frontend does not; frontend cannot use it without changes |

### Employee/User Linking

| Aspect | Status |
|---|---|
| workforce-backup RBAC | ✅ `ScopedRoleAssignment` links `Role` to `Membership` (user↔business), optionally scoped to `Location` (DECISIONS.md D-0011) |
| workforce-console candidate models | `apps/api/app/models/employee.py` and `user_employee_link.py` added (CURRENT_STATE.md 2026-04-18) — status: `[NEEDS MIGRATION AND VERIFICATION]` |
| workforce-showcase proxy | ✅ `/auth/me/access-context` implemented locally via SQLite; upstream support unverified |
| Cross-repo alignment | 🔴 Three different implementations; no shared spec |

### Business/Location Scoping

| Aspect | Status |
|---|---|
| workforce-backup | ✅ `ScopedRoleAssignment.location_id` NULL = business-wide (D-0011); `location_aware_permission` dependency added (WORKLOG 2026-04-28) |
| workforce-showcase | ✅ `active_business_id` in session; `employee_role_assignments` in local DB; `/auth/switch-business` in spec |
| workforce-console | ✅ GET `/api/v1/bootstrap` returns `{businesses, locations}` |

### Role/Permission Naming Conventions

| Convention | workforce-showcase Frontend | workforce-backup Backend | Status |
|---|---|---|
| Wildcard permission strings | `"owner:*"`, `"business:owner"`, `"superadmin:*"` | Atomic codes (e.g., `schedule:read`) per D-0011 | 🔴 Mismatch: frontend uses wildcards; backup uses atomic codes |
| Role names | `hasRole("owner")` | Role names set at migration time; exact strings not in spec | ⚠️ Cannot verify without checking backup's seeded roles |
| Permission resolution | Client-side via `hasPermission()` | Server-side via `rbac_service.py` (`Role → RolePermission → Permission.code`) | 🔴 No shared permission catalogue; client/server may check different strings |

### Error Response Shape

| Aspect | OpenAPI Spec | Frontend Assumption | Status |
|---|---|---|
| Error body | `{ detail: string }` | Reads `errorData.detail \|\| errorData.message` | ✅ Aligned for 4xx errors (frontend handles both gracefully) |
| HTTP 503 from console | Not in spec | Frontend likely not handling 503 | ⚠️ Login 503 in console will present as unexpected error in frontend |

### CORS / Frontend Origin Assumptions

| Aspect | Evidence | Status |
|---|---|---|
| workforce-showcase dev CORS | Vite proxy forwards `/api/v1` → `hn3t.pythonanywhere.com` | ✅ OK for development |
| workforce-showcase production CORS | `.env.production` sets `VITE_API_BASE_URL=https://hn3t.pythonanywhere.com` | 🔴 Must verify `Access-Control-Allow-Origin` on PythonAnywhere backend |
| workforce-backup CORS | Added `https://hospitable-web.onrender.com` (WORKLOG 2026-05-03); PythonAnywhere origins not added | 🔴 PythonAnywhere frontend origins still not in CORS allowlist |
| workforce-console CORS | Not observable from file reads | ⚠️ `[NEEDS VERIFICATION]` |

### Required Contract Specifications (Currently Missing)

1. Canonical response shape for `/auth/me` (flat vs nested; `is_active`, `is_superadmin` fields)
2. Canonical permission string format (atomic codes per backup's D-0011 vs wildcard strings used by showcase frontend)
3. Formal shared spec for `/api/v1/bootstrap` (already implemented in console; absent from showcase spec)
4. Formal spec for `/auth/me/access-context`
5. Spec for all routes proxied by showcase api-server but absent from `openapi.yaml`: `/workforce`, `/inspections`, `/maintenance`, `/inventory`, `/studio`, `/promotions`, `/admin`, `/notifications`, `/business`, `/hospitable`
6. Alignment spec for registration/create-user endpoint (console has `/auth/register`; showcase does not)
7. CORS policy documentation for all deployment domains (PythonAnywhere + Render)
8. Canonical employee/user link model spec shared across repos

---

## 5. Deployment Readiness Matrix

| Component | Domain/Target | Build/Runtime | Env Vars | Health Check | Status | Blockers |
|---|---|---|---|---|---|---|
| **Frontend SPA** (showcase) | `https://wf-hn3t.pythonanywhere.com` (assumed) | Vite build → `dist/public`; served by Flask `app.py` | `PORT` ✅ required, `BASE_PATH` ✅ required, `VITE_API_BASE_URL` ✅ set in `.env.production` | None (SPA) | ❌ NO-GO | 32 TS errors; CI never passed; Playwright validation blocked |
| **Local API Proxy** (showcase api-server) | `localhost:8080` (dev only) | Node.js/ESM; `npm run dev` / `node dist/index.js` | None documented | None | 🟡 Dev-only | No production deployment target documented |
| **Platform Backend** (backup) | `https://hn3t.pythonanywhere.com` or Render (`https://hospitable-web.onrender.com` added to CORS) | Python/FastAPI via Poetry + `wsgi.py` (a2wsgi); PythonAnywhere WSGI or Render web service | `SKIP_WORKFORCE_MODELS=1` ✅ set in `main.py` + `wsgi.py`; `PYTHONPATH=apps/api`; PostgreSQL URL required in prod | `/api/healthz` (defined in spec; not confirmed live) | 🟡 Partial | PostgreSQL migration unverified; `foundation-v0.1` tag not cut; PythonAnywhere origins not in CORS |
| **Console Backend** (`workforce_api/`) | `https://hn3t.pythonanywhere.com` or local (ports 8002/8003 per PROGRESS_REPORT.md) | Python/FastAPI + uvicorn; Alembic migrations | PYTHONPATH, DB URL, SKIP_WORKFORCE_MODELS unknown in prod | None confirmed | 🔴 Broken | Login returning 500/503; DB migrations not run on production; host mapping unclear |
| **Console Frontend** (`workforce_frontend_app/`) | Unknown — artifact delivery path unclear (CURRENT_STATE.md: "Frontend artifact host — Needs verification") | Vite build in `workforce_frontend_app/artifacts/workforce-console/` | VITE env vars unknown in prod | None | 🔴 Unknown | Deployment host/path not confirmed in any file |
| **Developer Hub** | `https://devhub-hn3t.pythonanywhere.com` (assumed) | Static HTML (`developer_hub/index.html`) | None | None | ⚠️ Unknown | Domain mapping not confirmed |
| **Database** (showcase SQLite) | `hospitable.db` in repo root | SQLite via Drizzle ORM (`lib/db`) | None | None | ⚠️ Dev/local only | `hospitable.db` committed to repo (security risk) |

---

## 6. Security / RBAC / Data Integrity Summary

### Authentication
- **Token storage (showcase + console frontend):** `workforce_token` stored in `localStorage`. XSS-vulnerable. No `httpOnly` cookie alternative.
- **Token type:** UUID (not JWT) for local sessions (showcase); JWT or session token format for console backend unknown.
- **Local credential override (showcase):** `POST /auth/reset` creates local DB overrides — no auth guard; must never be deployed to a production-accessible host.
- **Login 500/503 (console):** Production login is broken due to unprovisioned DB. Temporary 503 mitigation added but root cause (missing migrations + seed) not resolved.

### RBAC
- **workforce-backup canonical RBAC (DECISIONS.md D-0011):** `memberships → ScopedRoleAssignment → Role → RolePermission → Permission.code`. Atomic permission codes (e.g., `schedule:read`). `GET /api/v1/me/effective-permissions` endpoint added (WORKLOG 2026-04-28).
- **workforce-backup legacy surface (frozen per D-0004):** `biz_roles / biz_role_permissions / membership_roles / membership_location_roles` in `packages/workforce/workforce/app/models/identity.py` — NOT created by any canonical migration; NOT used by runtime API. `SKIP_WORKFORCE_MODELS=1` guard required to prevent double SQLAlchemy table registration. Boot fails without this guard.
- **workforce-showcase frontend RBAC:** Permission strings (`owner:*`, `business:owner`, `superadmin:*`) are client-side only. No shared catalogue. Mismatches with backup's atomic codes confirmed.
- **RBAC gap:** No mapping table between backup's atomic permission codes and showcase's wildcard strings exists anywhere in any repo.

### Tenant/Business/Location Scoping
- **workforce-backup:** `ScopedRoleAssignment.location_id` NULL = business-wide, non-NULL = location-scoped. `resolve_location_from_query` helper + location-aware permission dependency added (WORKLOG 2026-04-28).
- **workforce-showcase:** `active_business_id` in session; `employee_role_assignments` locally. `SILVER_SANDS_BUSINESS_ID = "biz-silver-sands"` hardcoded — must not reach production.
- **workforce-console:** Bootstrap returns `{businesses, locations}` — scoping model partially present.

### User/Employee Separation
- **workforce-backup:** `Membership` (user ↔ business); `ScopedRoleAssignment` (role scoping); no separate employee model in canonical surface (packages/workforce has one but is frozen).
- **workforce-console:** Candidate `employee.py` + `user_employee_link.py` models added (2026-04-18) — `[NEEDS MIGRATION AND VERIFICATION]`.
- **workforce-showcase:** `user_employee_links` + `employee_profiles` in local SQLite; `EmploymentScope` in frontend.
- **Risk:** Three diverged implementations with no shared migration or spec.

### Admin Tooling
- workforce-showcase: `/api/v1/admin` routes proxied to `localhost:8080`; admin auth guard unconfirmed.
- workforce-backup: No admin-specific tooling observed in accessible docs.
- workforce-console: No admin tooling confirmed.

### CORS
- workforce-backup: `https://hospitable-web.onrender.com` added to CORS allowlist (2026-05-03). PythonAnywhere frontend origins (`wf-hn3t.pythonanywhere.com`) NOT in allowlist. 🔴
- workforce-showcase dev: Vite proxy avoids CORS. ✅ Production: calls `hn3t.pythonanywhere.com` cross-origin. 🔴 Not confirmed.
- workforce-console: CORS config not observable from remote file reads. ⚠️ `[NEEDS VERIFICATION]`

### Secrets
- `hospitable.db` (SQLite) committed to showcase repo root — potential real data exposure. 🔴
- `DECISIONS.md D-0005` (backup): "Local databases and database backups are never tracked" — policy correct but showcase violates this.
- workforce-backup: `.env*` files properly excluded per D-0005.
- No secrets hardcoded in backup or console source code (confirmed via accessible file reads).

### Deployment Config
- workforce-backup: `SKIP_WORKFORCE_MODELS=1` set in `main.py` and `wsgi.py` (WORKLOG 2026-04-28). Missing this causes boot failure.
- workforce-showcase: `BASE_PATH` and `PORT` required at build time — missing causes build failure.
- workforce-console: Deployment env var requirements not documented.

### Generated Files
- workforce-showcase: `lib/api-client-react` generated from OpenAPI spec via orval; declaration files not built; 32 TS errors.
- workforce-backup/console: No generated type client observed.

### Public/Private Boundary
- workforce-showcase developer hub (`developer_hub/`) is public-facing static HTML. Content not audited for internal endpoint links.
- workforce-showcase `POST /auth/reset` must never be publicly accessible.

---

## 7. Documentation / Source-of-Truth Summary

### Best Source-of-Truth Docs

| Document | Location (Repo) | Purpose |
|---|---|---|
| `docs/DECISIONS.md` (esp. D-0011) | workforce-backup | Canonical RBAC schema decision; authoritative for backend model |
| `lib/api-spec/openapi.yaml` | workforce-showcase | API contract definition — authoritative for generated types (partial coverage) |
| `docs/ADMIN/frontend/QA-cutover-plan.md` | workforce-showcase | Pre-production validation checklist |
| `docs/ADMIN/frontend/PROGRESS_REPORT_FRONTEND.md` | workforce-showcase | Current execution status and NO-GO record |
| `docs/00_START_HERE/CURRENT_STATE.md` | workforce-console | Evidence-based snapshot of backend/frontend state (2026-04-18) |
| `docs/00_START_HERE/CANONICAL_SOURCES.md` | workforce-console | Exact source mapping for console repo artifacts |
| `docs/ROADMAP.md` | workforce-backup | Phase-by-phase delivery plan (Phase 0 through 6) |
| `docs/reports/REPO_EVALUATION_REPORT.md` | workforce-showcase | Individual repo evaluation (this repo only) |

### Stale / At-Risk Docs

| Document | Repo | Issue |
|---|---|---|
| `docs/plans/HN3T_MASTER_PLAN.md` | workforce-showcase | Points to `/home/hn3t/workforce/HN3T_MASTER_PLAN.md` — machine-local absolute path |
| `.copilot_frontend/state.json` | workforce-showcase | References `active_repo: /home/hn3t/workforce_frontend_app` — machine-local path |
| `docs/ADMIN/frontend/QA-cutover-plan.md` | workforce-showcase | References `/home/hn3t/workforce_frontend_app/...` paths throughout |
| `PROGRESS_REPORT.md` (root) | workforce-console | Contains raw machine session log (local paths, port numbers, manual commands); not a clean canonical doc |
| `workforce_new/` | workforce-console | Legacy/experimental backend surface; explicitly flagged as "do not treat as active by default" |

### Missing Docs

| Missing Document | Where Needed | Why |
|---|---|---|
| `docs/reports/REPO_EVALUATION_REPORT.md` | workforce-backup | Required by issue #19; not yet created |
| `docs/reports/REPO_EVALUATION_REPORT.md` | workforce-console | Required by issue #18; not yet created |
| Deployment topology map | All repos | No single document maps each domain/host to its serving application |
| CORS policy specification | All repos | Required before any production deployment |
| Canonical permission/role naming conventions | All repos | Required to verify frontend ↔ backend RBAC alignment |
| Shared `.env.example` | All repos | No consolidated env var reference |
| `docs/boundary/pythonanywhere-matrix.md` | workforce-console | PythonAnywhere host mapping identified as missing in EXECUTION_QUEUE.md |
| Employee/user link spec | All repos | Three diverged implementations; no shared spec |

### Duplicated Docs
- `route-validation-summary.md` exists both at showcase repo root and in `docs/ADMIN/frontend/artifact-diffs/` — root copy should be removed.
- `WORKFORCE_CROSS_REPO_EVALUATION_REPORT.md` exists in workforce-backup's `docs/reports/` — backup has its own version of this cross-repo report from a previous session (2026-05-03). The authoritative version is in workforce-showcase.

### Docs to Surface in Showcase/Devhub
- `docs/ADMIN/frontend/PROGRESS_REPORT_FRONTEND.md` — production readiness status
- `docs/ADMIN/frontend/QA-cutover-plan.md` — deployment gate checklist
- `lib/api-spec/openapi.yaml` — served as interactive API docs (Swagger UI/Redoc)
- workforce-backup `docs/DECISIONS.md` — canonical architectural decisions

### Docs to Archive
- `docs/ADMIN/frontend/CI_TRIGGER_ATTEMPT.md` — recording of a failed push; archive in `docs/ADMIN/frontend/archive/`
- `workforce_new/` (workforce-console) — explicitly marked legacy/experimental; should be archived or removed
- Machine-path references in master plan files — replace with repo-relative paths

---

## 8. Top 10 Risks

| Rank | Risk | Repos Affected | Severity | Evidence | Recommended Fix |
|---|---|---|---|---|---|
| 1 | **Dual RBAC schema in workforce-backup** — `SKIP_WORKFORCE_MODELS=1` guard required; if removed or missing, boot fails due to double SQLAlchemy table registration | workforce-backup | 🔴 High | `DECISIONS.md D-0011`: "SKIP_WORKFORCE_MODELS=1 must remain set at boot… Do not remove this guard until the packages/workforce import path is fully eliminated"; `WORKLOG 2026-04-28`: guard added to `main.py` + `wsgi.py` | Archive `packages/workforce` surface; remove guard when safe; document risk in deploy checklist |
| 2 | **Login 500/503 in workforce-console production** — users cannot authenticate; root cause is unprovisioned DB | workforce-console | 🔴 High | `PROGRESS_REPORT.md 2026-04-18`: "POST /api/v1/auth/login returns HTTP 500 in production… auth path exercises DB; production DB/migrations or provisioning appears incomplete" | Run `alembic upgrade head` + seed DB on production; verify login returns 200 |
| 3 | **RBAC permission string mismatch** — showcase frontend uses wildcard strings (`owner:*`); backup backend uses atomic codes (`schedule:read`) | workforce-showcase, workforce-backup | 🔴 High | workforce-showcase `auth-context.tsx` uses `hasPermission("owner:*")`; backup `DECISIONS.md D-0011` defines `Permission.code` as atomic string; no mapping table | Publish canonical permission catalogue; update frontend to use atomic codes or define explicit wildcard → atomic mapping |
| 4 | **Unverified CORS for PythonAnywhere origins** — production frontend at `wf-hn3t.pythonanywhere.com` calls `hn3t.pythonanywhere.com`; not in CORS allowlist | workforce-showcase, workforce-backup | 🔴 High | backup `WORKLOG 2026-05-03`: only `https://hospitable-web.onrender.com` added; PythonAnywhere origins not added; showcase `.env.production` targets `hn3t.pythonanywhere.com` | Add PythonAnywhere frontend origins to backup CORS allowlist; verify with browser request |
| 5 | **`hospitable.db` committed to showcase repo** — SQLite DB with potentially real data tracked in git | workforce-showcase | 🔴 High | `hospitable.db`, `hospitable.db-shm`, `hospitable.db-wal` in repo root; not in `.gitignore` for data files | Add `*.db`, `*.db-shm`, `*.db-wal` to `.gitignore`; purge from history if real data; align with backup's D-0005 |
| 6 | **`localStorage` token storage** — `workforce_token` stored in `localStorage` is XSS-vulnerable | workforce-showcase, workforce-console | 🔴 High | showcase `api-client.ts`: `localStorage.getItem("workforce_token")`; `auth-context.tsx`: `localStorage.setItem(...)` | Migrate to `sessionStorage` with short-lived tokens or `httpOnly` cookies |
| 7 | **PostgreSQL migration chain unverified in workforce-backup** — only SQLite tested locally; `foundation-v0.1` tag not cut | workforce-backup | 🟡 Medium | `WORKLOG 2026-05-03`: "PostgreSQL migration verification is not possible in this environment"; `TODO.md`: "Verify Alembic migration chain on PostgreSQL before cutting foundation-v0.1 tag" | Provision PostgreSQL in CI; run `alembic upgrade head`; verify 53 tests pass; cut tag |
| 8 | **`lib/api-client-react` declarations not built** — 32 TypeScript errors prevent clean typecheck/build | workforce-showcase | 🟡 Medium | `PROGRESS_REPORT_FRONTEND.md`: "imports from lib/api-client-react are failing because the lib's declaration files were not built" | Run `pnpm --filter @workspace/api-client-react run build` in CI; commit output or add to build pipeline |
| 9 | **No passing CI run in workforce-showcase** — browser validation workflow never pushed to remote | workforce-showcase | 🟡 Medium | `PROGRESS_REPORT_FRONTEND.md`: "refusing to allow a Personal Access Token to create or update workflow without `workflow` scope" | Grant `workflow` scope to PAT; push and run the workflow |
| 10 | **Unauthenticated `/auth/reset` endpoint** — anyone can override credentials for any email if api-server is reachable | workforce-showcase | 🟡 Medium | `artifacts/api-server/src/auth/router.ts`: `router.post("/reset", ...)` with no auth guard | Gate behind a strong secret or remove from non-dev builds |

---

## 9. Top 10 Recommended Next Actions

| Rank | Priority | Repo | Task | Why It Matters |
|---|---|---|---|---|
| 1 | 🔴 Critical | workforce-backup | Verify Alembic migration chain on PostgreSQL and cut `foundation-v0.1` tag | PostgreSQL is the production DB target; SQLite-only validation is insufficient for a production baseline |
| 2 | 🔴 Critical | workforce-console | Run `alembic upgrade head` + seed DB on production; fix login 500 | Users cannot authenticate; no production value without working login |
| 3 | 🔴 Critical | workforce-backup | Add PythonAnywhere frontend origins to CORS allowlist | Production showcase frontend at `wf-hn3t.pythonanywhere.com` calls backup API cross-origin; without CORS, all requests fail |
| 4 | 🔴 Critical | All repos | Create individual `REPO_EVALUATION_REPORT.md` in workforce-backup (issue #19) and workforce-console (issue #18) | This cross-repo report cannot be fully populated without per-repo reports |
| 5 | 🔴 Critical | workforce-showcase | Remove `hospitable.db*` from git tracking; add to `.gitignore`; audit for real data exposure | Committed DB file is a data integrity and privacy risk; violates backup's own D-0005 policy |
| 6 | 🟡 High | workforce-showcase | Build `lib/api-client-react` declaration files and fix TypeScript errors (target: 0 errors) | Prerequisite for a clean build and any production deployment |
| 7 | 🟡 High | workforce-showcase | Grant PAT `workflow` scope; push Playwright CI workflow; verify passing run | Without passing CI, there is no automated quality gate |
| 8 | 🟡 High | All repos | Publish canonical permission string catalogue; align showcase frontend wildcard strings with backup's atomic codes | Current mismatch means frontend RBAC checks silently fail against the platform backend |
| 9 | 🟡 High | workforce-showcase | Migrate `workforce_token` from `localStorage` to a more secure mechanism | Token XSS exposure is a significant auth security risk |
| 10 | 🟢 Medium | All repos | Create deployment topology document mapping each domain/host to its serving application; clarify PythonAnywhere vs Render | Two different hosting platforms referenced across repos with no canonical mapping; operational confusion |

---

## Appendix A: Repository Structure Summary (workforce-showcase)

```
workforce-showcase/
├── app.py                          # Flask SPA fallback server
├── .env.production                 # Production env: VITE_API_BASE_URL=https://hn3t.pythonanywhere.com
├── hospitable.db                   # ⚠️ SQLite DB committed to repo
├── artifacts/
│   ├── api-server/                 # Local Node.js/Express API proxy
│   │   └── src/auth/router.ts      # Auth proxy + local credential override + hardcoded SILVER_SANDS_BUSINESS_ID
│   └── workforce-console/          # Frontend SPA (React + Vite)
│       ├── src/lib/api-client.ts   # HTTP client; reads localStorage token
│       ├── src/lib/auth-context.tsx # AuthProvider + session management
│       └── vite.config.ts          # Build config; requires PORT + BASE_PATH
├── lib/
│   ├── api-spec/openapi.yaml       # OpenAPI 3.1 spec (partial coverage)
│   ├── api-client-react/           # Generated TypeScript client (declarations not built — 32 TS errors)
│   ├── api-zod/                    # Generated Zod schemas
│   └── db/                         # Drizzle ORM schema + migrations
├── developer_hub/                  # Static HTML dev hub
├── docs/
│   ├── ADMIN/frontend/             # Operational runbooks, progress report, cutover plan
│   ├── planning/                   # Templates and planning docs
│   ├── plans/                      # Execution pointers
│   └── reports/                    # REPO_EVALUATION_REPORT.md + this file
└── dist/                           # Built SPA output (not in repo; produced at build time)
```

---

## Appendix B: Repository Structure Summary (workforce-backup)

*Read from GitHub API — no local clone available.*

```
workforce-backup/
├── apps/
│   └── api/
│       └── app/
│           ├── main.py             # FastAPI entrypoint; SKIP_WORKFORCE_MODELS=1 default
│           ├── models/
│           │   ├── access_control.py     # Re-export shim → access_control_local.py
│           │   └── access_control_local.py  # Canonical RBAC models (D-0011)
│           ├── services/
│           │   └── rbac_service.py      # Permission resolution service
│           └── api/v1/              # Route handlers (health, rooms, tasks, assignments, shifts, bootstrap, me)
├── packages/
│   └── workforce/workforce/app/models/identity.py  # ⚠️ Frozen legacy; double-registers tables; guarded by SKIP_WORKFORCE_MODELS=1
├── alembic/                         # Migrations; single head: 20260425_add_membership_fields
├── wsgi.py                          # PythonAnywhere WSGI wrapper (a2wsgi)
├── .github/workflows/
│   ├── ci.yml                       # Fixed 2026-05-03: matrix python versions, PYTHONPATH, SKIP_WORKFORCE_MODELS
│   └── backend-ci.yml               # Added 2026-05-03: install → alembic upgrade → alembic check → pytest
├── docs/
│   ├── DECISIONS.md                 # D-0001..D-0011 + migration decisions; canonical RBAC in D-0011
│   ├── ROADMAP.md                   # Phase 0 through 6 delivery plan
│   ├── PHASE_STATUS.md              # Current: Phase 0 — Foundation Freeze
│   ├── TODO.md                      # Phase 0 tasks; PostgreSQL verification and v0.1 tag pending
│   ├── WORKLOG.md                   # Evidence-based change log
│   └── reports/
│       └── WORKFORCE_CROSS_REPO_EVALUATION_REPORT.md  # ⚠️ Backup's own copy; superseded by this file
└── pyproject.toml                   # Poetry; a2wsgi runtime dep added 2026-04-28
```

---

## Appendix C: Repository Structure Summary (workforce-console)

*Read from GitHub API — no local clone available.*

```
workforce-console/
├── HN3T_MASTER_PLAN.md             # High-level program plan
├── PROGRESS_REPORT.md              # Machine session log (not a structured report)
├── RUNNING_SERVICES.md             # Service status log
├── run_plan.sh                     # Deployment/run script
├── workforce_api/                  # FastAPI backend (canonical active surface)
│   └── apps/api/app/
│       ├── main.py                 # FastAPI entrypoint
│       ├── api/v1/endpoints/       # bootstrap.py, auth (login/register), rooms, tasks, shifts, assignments
│       ├── models/
│       │   ├── employee.py         # ⚠️ Candidate model; needs migration + verification
│       │   └── user_employee_link.py  # ⚠️ Candidate model; needs migration + verification
│       └── services/               # housekeeping_service.py, room_board_service.py, rbac_service.py
├── workforce_frontend_app/         # React/Vite frontend SPA
│   ├── artifacts/workforce-console/ # Frontend code
│   │   └── src/lib/auth-context.tsx  # Uses GET /api/v1/bootstrap when no token
│   └── docs/ADMIN/frontend/         # Frontend admin docs and runbooks
├── workforce_new/                  # ⚠️ Legacy/experimental backend; do not treat as active
├── upload/                         # PDF exports and uploads
└── docs/
    ├── 00_START_HERE/
    │   ├── CURRENT_STATE.md        # Evidence-based snapshot (2026-04-18)
    │   ├── CANONICAL_SOURCES.md    # Source mapping
    │   ├── EXECUTION_QUEUE.md      # Ordered task queue
    │   └── OPEN_DECISIONS.md       # Open architectural decisions
    ├── planning/                   # Consolidated master plan
    └── workstreams/                # workforce-web-ui workstream docs
```

---

*This report was updated by automated analysis using GitHub API access to all three repositories. Individual `REPO_EVALUATION_REPORT.md` files do not yet exist in workforce-backup or workforce-console — this cross-repo report is currently the most detailed multi-repo assessment available.*
