# Workforce Cross-Repo Evaluation Report

**Generated:** 2026-05-04 (updated from 2026-05-03 placeholder)
**Coordination Hub:** `workforce-showcase`
**Report Author:** Copilot Agent (automated analysis via GitHub MCP tools)
**Source reports used:**
- `docs/reports/REPO_EVALUATION_REPORT.md` in this repo (Workforce-Showcase, generated 2026-05-04)
- `docs/reports/WORKFORCE_CROSS_REPO_EVALUATION_REPORT_2026-05-03.md` in `hn3tdevops-jpg/Workforce-backup` (generated 2026-05-03 by Copilot agent with full read access)
- GitHub MCP tool inspection of `hn3tdevops-jpg/Workforce-backup` and `hn3tdevops-jpg/Workforce-Console` (2026-05-04)

---

## Report Inventory

| Report | Status |
|---|---|
| `workforce-backup/docs/reports/REPO_EVALUATION_REPORT.md` | ❌ MISSING — `docs/reports/` contains only cross-repo evaluation reports; no individual repo evaluation report exists |
| `workforce-showcase/docs/reports/REPO_EVALUATION_REPORT.md` | ✅ EXISTS — generated 2026-05-04, see `docs/reports/REPO_EVALUATION_REPORT.md` |
| `workforce-console/docs/reports/REPO_EVALUATION_REPORT.md` | ❌ MISSING — `docs/` contains planning, workstreams, archive subdirs; no `reports/` subdir; no individual evaluation report; root-level `PROGRESS_REPORT.md` serves as a historical journal, not a structured evaluation |
| `workforce-backup/docs/reports/WORKFORCE_CROSS_REPO_EVALUATION_REPORT_2026-05-03.md` | ✅ EXISTS — detailed updated cross-repo evaluation authored 2026-05-03; used as primary source for this report |

> **Note:** The cross-repo report in `workforce-backup` (`WORKFORCE_CROSS_REPO_EVALUATION_REPORT_2026-05-03.md`) is the most authoritative prior source, authored with full local clone access to all three repos. This Showcase report consolidates those findings with the Showcase-specific evaluation.

---

## 1. Executive Summary

### Overall System Health: 🟡 Foundation Partially Stabilized — Frontend/Backend Contract Partially Aligned

As of 2026-05-04, the Workforce platform spans three GitHub repositories:

- **`hn3tdevops-jpg/Workforce-backup`** — Python/FastAPI backend (source-of-truth). Tests passing (53/53). CORS configured and compatible with Showcase frontend. RBAC partially implemented (~80% of master plan requirements).
- **`hn3tdevops-jpg/Workforce-Showcase`** — Primary frontend workspace (pnpm monorepo): React/Vite SPA, Node.js local API proxy, shared TS libs, dev hub, docs. CI failing. 16+ TypeScript errors remain. Status: NO-GO.
- **`hn3tdevops-jpg/Workforce-Console`** — Development/reconciliation workspace (Replit context). Not an independent deployable. No individual evaluation report. Most recent activity: hydrating effective permissions in auth context (2026-04-29).

### Production Readiness

❌ **Not ready.** Key blockers include:
1. **`/auth/me/access-context` missing from Python backend** — Showcase frontend calls this endpoint on startup; the Python backend (`hn3t.pythonanywhere.com`) does not implement it. Without the local Node.js proxy, `employmentScope` is always `null` and `hasEmployeePermission()` always returns `false`.
2. **16+ TypeScript errors in Showcase libs** — `lib/api-client-react` declaration files not built; 16+ type errors prevent a clean build.
3. **CI failing in Showcase** — All recent CI runs fail (`pyproject.toml changed significantly since poetry.lock was last generated`). No automated quality gate.
4. **`/auth/me` schema drift** — Backend `MeResponse` does not include `first_name`, `last_name`, or `business_name` in memberships; OpenAPI spec and frontend defensive mapping partially compensate.
5. **Unauthenticated `/auth/reset` endpoint** in local api-server — dangerous if api-server is ever deployed to a production-accessible host.

### Risks Confirmed Resolved Since Prior Placeholder Report

- ✅ **CORS origin mismatch resolved** — Showcase correctly targets `https://hn3t.pythonanywhere.com`, which is in the backend's CORS allowlist.
- ✅ **Backend tests passing** — 53/53 tests pass in Workforce-backup (`PYTHONPATH=apps/api SKIP_WORKFORCE_MODELS=1 python -m pytest -q tests`).
- ✅ **Canonical RBAC active** — Active auth flow uses canonical local RBAC tables (`roles`, `role_permissions`, `scoped_role_assignments` / `MembershipRole`).
- ✅ **Login and switch-business flows structurally compatible** — Frontend defensive mapping in `mapToSessionInfo()` tolerates backend response shape differences.

### Top Blockers (as of 2026-05-04)

1. `GET /auth/me/access-context` missing from Python backend — `employmentScope` always null in production without local proxy
2. 16+ TypeScript errors in `lib/` — declaration files not built; `lib/api-client-react` unresolvable
3. CI permanently failing in Showcase (poetry.lock stale)
4. `/auth/me` shape drift — `first_name`, `last_name`, `business_name` not in backend response; spec and frontend mismatch
5. `hospitable.db` SQLite file committed to Showcase repo root (potential data exposure)

---

## 2. Repo Health Matrix

| Repo | Purpose | Language/Runtime | Health | Production Readiness | Biggest Risk | Next Step |
|---|---|---|---|---|---|---|
| **workforce-showcase** | Full-stack showcase monorepo: frontend SPA, local Node.js API proxy, shared TS libs, dev hub, docs | TypeScript, React 19, Vite 7, pnpm | 🟡 Partial | ❌ NO-GO (documented) | 16+ TS errors; CI failing; `access-context` endpoint missing from prod backend | Fix `lib/api-client-react` declaration build; resolve poetry.lock CI issue |
| **workforce-backup** | Backend source-of-truth: Python/FastAPI API, RBAC, Alembic migrations; also contains embedded Next.js frontend (`apps/web/hospitable-web`) | Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, Poetry | 🟢 Stable (backend) | 🟡 Backend deployable to PythonAnywhere; embedded Next.js frontend has CORS issue | Location owner delegation gaps in RBAC; `render.yaml` targets a domain not in CORS allowlist | Implement location-owner delegation; add audit logging for RBAC changes |
| **workforce-console** | Development/reconciliation workspace (Replit context); contains same `artifacts/workforce-console` artifact structure as Showcase | TypeScript, pnpm | 🟡 Partial | ❌ Not an independent deployable | Divergence from Showcase canonical artifact; no evaluation report | Confirm canonical artifact is in Showcase; deprecate or archive Console workspace |

---

## 3. Cross-Repo Compatibility Matrix

| Compatibility Area | Status | Evidence | Risk | Required Action |
|---|---|---|---|---|
| **CORS (Showcase → backend)** | ✅ Compatible | `apps/api/app/main.py`: allowlist includes `https://hn3t.pythonanywhere.com`, `https://wf-hn3t.pythonanywhere.com`, localhost:5000, localhost:5173, localhost:3000; Showcase `.env.production` targets `https://hn3t.pythonanywhere.com` | Low | No action needed; document allowlist for future domain additions |
| **CORS (backup embedded Next.js → backend)** | ❌ Mismatch | `render.yaml` sets `NEXT_PUBLIC_API_BASE_URL=https://api-hn3t.pythonanywhere.com`; this domain is NOT in the backend CORS allowlist | High if deployed via Render | Either add `api-hn3t.pythonanywhere.com` to CORS allowlist or fix render.yaml to use `hn3t.pythonanywhere.com` |
| **Auth token / Bearer header** | ✅ Aligned | Backend: `Authorization: Bearer <token>`; frontend: `fetchApi()` sets same; `allow_credentials=False` compatible with no `credentials: 'include'` | Low | No action needed |
| **Login response shape** | ⚠️ Partially aligned | Backend returns `{access_token, token_type, business_id, user{id,email,is_active}}`; frontend reads `access_token` only; spec only defines `{access_token, token_type}` | Low (frontend works) | Expand OpenAPI spec to document `business_id` and `user` in login response |
| **`/auth/me` response shape** | ⚠️ Shape drift | Backend: `{user{id,email,is_active}, business_id, memberships[{business_id,status,is_owner}], roles, permissions}`; spec: `SessionInfo{id,email,first_name,last_name,memberships[{business_id,business_name,role}],active_business_id,...}`; frontend uses `mapToSessionInfo()` with defensive fallbacks | Medium | Canonicalize `/auth/me` shape in spec and backend; align `active_business_id` vs `business_id` field name |
| **`/auth/me/access-context` endpoint** | ❌ Gap — missing from backend | Endpoint exists in Showcase local Node.js proxy only; Python backend does not implement it; frontend silently catches error and sets `employmentScope = null` | High — `hasEmployeePermission()` always false in production | Implement `GET /auth/me/access-context` in Python backend, OR remove the employment-scope permission layer and use backend `effective-permissions` endpoint instead |
| **`/me/effective-permissions` endpoint** | ⚠️ Unspecified, underused | Backend implements `GET /me/effective-permissions` returning sorted `string[]`; not called in Showcase auth flow; not in OpenAPI spec | Medium | Add to spec; wire to Showcase `hasEmployeePermission()` as a replacement for missing `access-context` |
| **`/bootstrap` endpoint** | ❌ Contract name collision | Backend `POST /bootstrap`: one-time server initialization (creates tenant/admin); Workforce-Console assumed `GET /bootstrap` returns feature flags; Showcase has a `/bootstrap` pre-auth page | Medium (confusing) | Rename one of the two concepts; document each clearly; remove feature-flag bootstrap assumption from Console |
| **RBAC permission strings** | ⚠️ Unverified cross-repo | Frontend checks `hasPermission("owner:*")`, `hasPermission("business:owner")`, `isSuperAdmin()` via `"superadmin:*"`; backend permission names from `roles_seed.py` are unknown (not inspected in this session) | High | Document canonical permission codes in backend `roles_seed.py` / `DEFAULT_PERMISSIONS`; confirm they match frontend string checks |
| **Backend RBAC model** | ⚠️ Legacy tables present | Active model: `roles`, `role_permissions`, `scoped_role_assignments` / `MembershipRole`; legacy orphaned tables (`biz_roles`, `biz_role_permissions`, `membership_location_roles`) may still exist in some migration paths | Medium | Confirm legacy tables are dropped or inaccessible in production migrations; remove from codebase |
| **`hospitable.db` SQLite files** | ❌ Data exposure risk | `hospitable.db`, `hospitable.db-shm`, `hospitable.db-wal` committed to Showcase repo root; not in `.gitignore` | High | Add `*.db*` to `.gitignore`; audit file contents; purge from git history if real data present |
| **Build systems compatibility** | ⚠️ Different toolchains | Showcase: pnpm + Vite + TypeScript; Backup: Python/Poetry + Alembic; Console: pnpm workspace | Low | No action needed; document each stack separately |
| **CI/CD** | ❌ Showcase failing | Showcase CI: all runs fail (poetry.lock stale); Backup CI (`backend-ci.yml`): partially running; Console: `ci.yml` and `validate-employee-link-editable-install.yml` present | High | Fix Showcase CI (poetry.lock/pyproject.toml issue); verify Backup CI passes; establish a cross-repo validation procedure |
| **Generated TypeScript types** | ❌ Broken in Showcase | `lib/api-client-react` generated from `lib/api-spec/openapi.yaml` via orval; declaration files not built; 16+ TS errors in Showcase | High | Fix declaration build pipeline; regenerate from spec after spec is aligned with backend |
| **Docs / cross-repo path references** | 🟡 Partial | Many docs reference `/home/hn3t/...` absolute paths that do not exist outside the original developer machine | Low | Replace absolute paths with repo-relative paths or GitHub permalink URLs |

---

## 4. Backend / Frontend Contract Alignment

### Login Endpoint (`POST /api/v1/auth/login`)

| Aspect | Backend (Python) | Frontend Assumption | OpenAPI Spec | Status |
|---|---|---|---|---|
| Request body | `{ email, password }` | `{ email, password, business_id: null }` | `{ email, password }` | ⚠️ Frontend sends extra `business_id: null` field; backend appears to ignore it |
| Success response | `{ access_token, token_type, business_id, user{ id, email, is_active } }` | Reads `access_token` only | `{ access_token, token_type }` only | ⚠️ Spec incomplete; frontend works but spec should document `business_id` and `user` |
| Error response | `{ detail: string }` (FastAPI default) | Reads `errorData.detail \|\| errorData.message` | `{ detail: string }` with HTTP 401 | ✅ Aligned |
| 403 on no active membership | Returns 403 if user has no active membership | Not handled explicitly | Not in spec | ⚠️ Frontend may show generic error |

### `/auth/me` Endpoint (`GET /api/v1/auth/me`)

| Aspect | Backend (Python) | Frontend Assumption | OpenAPI Spec | Status |
|---|---|---|---|---|
| Response top-level | `{ user{ id, email, is_active }, business_id, memberships[], roles, permissions }` | `mapToSessionInfo()` with defensive fallbacks for both flat and nested shapes | `SessionInfo{ id, email, first_name, last_name, memberships[], active_business_id, roles, permissions }` | ⚠️ Backend uses `business_id`; spec uses `active_business_id`; `first_name`/`last_name` not in backend; frontend handles defensively |
| `memberships` items | `{ business_id, status, is_owner }` | Reads `business_id`; ignores `status`/`is_owner` in primary auth flow | `{ business_id, business_name, role }` | ⚠️ `business_name` and `role` not in backend response; spec and backend diverge |
| `is_active` field | `user.is_active` present | `data.user?.is_active` | Not in spec | ⚠️ Field present in backend and frontend but absent from spec |
| `is_superadmin` field | Not confirmed | `data.user?.is_superadmin` | Not in spec | ❌ Unknown — may or may not be in backend response |

### `/auth/me/access-context` Endpoint

| Aspect | Backend (Python) | Frontend Assumption | OpenAPI Spec | Status |
|---|---|---|---|---|
| Endpoint existence | ❌ **NOT implemented** | `fetchApi("/auth/me/access-context")` called on startup; error silently caught → `employmentScope = null` | `AccessContext{ user_id, has_access, scopes[] }` defined | ❌ **Critical gap** — missing from production backend |
| Production impact | N/A | `hasEmployeePermission()` always returns `false` in production (no local proxy) | N/A | ❌ Feature silently broken in production |

### Health Check

| Aspect | Backend (Python) | Frontend | OpenAPI Spec | Status |
|---|---|---|---|---|
| Path | `GET /health` (no `/api/v1` prefix) | Not called directly | `GET /healthz` defined | ❌ Spec diverges from backend; monitoring may hit wrong path |

### RBAC Permission Naming

| Permission String Used in Frontend | Backend Seed Confirmed | Status |
|---|---|---|
| `"owner:*"` | Unverified (not inspected in this session) | ⚠️ Assumed convention — must verify against `DEFAULT_PERMISSIONS` in `roles_seed.py` |
| `"business:owner"` | Unverified | ⚠️ Same |
| `"superadmin:*"` | Unverified | ⚠️ Same |

### Required Contract Specifications (Currently Missing)

1. Canonical `/auth/me` response shape — resolve `business_id` vs `active_business_id` and add `first_name`/`last_name` or remove from spec
2. `GET /auth/me/access-context` — implement in Python backend or remove from frontend and replace with `GET /me/effective-permissions`
3. Canonical permission string codes — document `DEFAULT_PERMISSIONS` in OpenAPI spec or a separate contract doc
4. `POST /bootstrap` vs feature-flag bootstrap disambiguation
5. CORS policy for any future frontend domains beyond the current allowlist
6. Spec coverage for routes proxied by `artifacts/api-server` but absent from `openapi.yaml` (`/workforce`, `/inspections`, `/maintenance`, `/inventory`, `/studio`, `/promotions`, `/admin`, `/notifications`, `/hospitable`)

---

## 5. Deployment Readiness Matrix

| Component | Domain/Target | Build/Runtime | Env Vars | Health Check | Status | Blockers |
|---|---|---|---|---|---|---|
| **Frontend SPA** (workforce-showcase, artifacts/workforce-console) | `https://wf-hn3t.pythonanywhere.com` (assumed); served by Flask `app.py` | Vite build → `dist/`; `PORT` + `BASE_PATH` required at build | `PORT` ✅, `BASE_PATH` ✅, `VITE_API_BASE_URL` ✅ (`.env.production`) | None (SPA, no `/healthz`) | ❌ NO-GO | 16+ TS errors; CI failing; `access-context` endpoint missing from prod backend |
| **Local API Proxy** (artifacts/api-server) | `localhost:8080` (dev only) | Node.js/ESM | None documented | None | 🟡 Dev-only; not for production deployment | Unauthenticated `/auth/reset` must be blocked before any production exposure |
| **Python Backend** (Workforce-backup) | `https://hn3t.pythonanywhere.com` via `wsgi.py` + `a2wsgi` | Python 3.12/FastAPI/Poetry on PythonAnywhere | `SECRET_KEY`, `DATABASE_URL`, `CORS_ALLOW_ORIGINS` (optional override) | `GET /health` → `{"status": "ok"}` | 🟡 Deployable; needs RBAC delegation fixes | Missing `access-context` endpoint; location-owner delegation gaps |
| **Embedded Next.js Frontend** (Workforce-backup, apps/web/hospitable-web) | Render target per `render.yaml`; `https://api-hn3t.pythonanywhere.com` as API base | Next.js, pnpm; `buildCommand: cd apps/web/hospitable-web && pnpm install && pnpm build` | `NEXT_PUBLIC_API_BASE_URL=https://api-hn3t.pythonanywhere.com` | None | ❌ NO-GO for this deployment target | `api-hn3t.pythonanywhere.com` is NOT in backend CORS allowlist; frontend would fail all API calls |
| **Developer Hub** (workforce-showcase, developer_hub/) | `https://devhub-hn3t.pythonanywhere.com` (assumed) | Static HTML | None | None | ⚠️ Unknown | Domain mapping not confirmed; content/links not audited |
| **Database** (Workforce-backup, PostgreSQL) | PythonAnywhere PostgreSQL (assumed) | Alembic migrations | `DATABASE_URL` | Via Alembic migration check | 🟡 Appears operational (53 tests pass) | Dev SQLite backup files (`dev.db.*.bak`) tracked in git root — audit and add to `.gitignore` |

---

## 6. Security / RBAC / Data Integrity Summary

### Authentication

| Area | Finding | Risk | Status |
|---|---|---|---|
| Token storage | `workforce_token` in `localStorage` (Showcase frontend) | XSS can exfiltrate token | 🔴 High |
| Token type | UUID for local sessions (local proxy); JWT from Python backend (unconfirmed format) | Format mismatch risk | ⚠️ Unverified |
| `/auth/reset` endpoint | Unauthenticated `POST /auth/reset` in Showcase local proxy allows credential override for any email | Dangerous if api-server is accessible on deployed host | 🔴 High |
| `allow_credentials` | Python backend: `False`; frontend: no `credentials: 'include'` | Consistent | ✅ |

### RBAC (from Workforce-backup `docs/rbac/RBAC_AUDIT_INDEX.md`)

The canonical Python backend RBAC model implements:

| Component | Status |
|---|---|
| `roles` table (role definitions per business) | ✅ Active |
| `role_permissions` (role-permission links) | ✅ Active |
| `scoped_role_assignments` / `MembershipRole` / `MembershipLocationRole` | ✅ Active |
| `BizRole`, `BizRolePermission` (legacy orphaned tables) | ⚠️ Present in some migrations; should be confirmed dropped |
| Location-scoped permission checks | ✅ Implemented (`scope_type`, `location_id`, `priority` on roles) |
| Superadmin bypass | ✅ Implemented |
| Permission union (business + location) | ✅ Implemented |
| Location owner delegation (`rbac.location_roles.manage`) | ❌ Missing |
| Audit logging for RBAC changes | ❌ Missing (infrastructure exists; not used for RBAC events) |
| Effective permissions API endpoint (`GET /me/effective-permissions`) | ✅ Implemented in Python backend; not wired to Showcase auth flow |
| Overall RBAC master plan compliance | ⚠️ ~80% |

### Tenant/Business/Location Scoping

- `active_business_id` in session; enforced by Python backend at route level.
- Location scoping via `MembershipLocationRole` implemented in backend; frontend reads scopes from `access-context` endpoint (not available in production — see critical gap above).
- `SILVER_SANDS_BUSINESS_ID = "biz-silver-sands"` hardcoded in Showcase local proxy (`artifacts/api-server/src/auth/router.ts`) — must not reach production.

### Data Integrity

| Risk | Evidence | Status |
|---|---|---|
| `hospitable.db` committed to Showcase repo root | `hospitable.db`, `hospitable.db-shm`, `hospitable.db-wal` tracked in git | 🔴 High — potential data exposure |
| Dev SQLite backup files in Workforce-backup root | `dev.db.backup`, `dev.db.before-...`, `dev.db.pre_...` etc. tracked in git | 🔴 High — potential data exposure |
| Machine-local absolute paths in docs | `docs/plans/HN3T_MASTER_PLAN.md`, `.copilot_frontend/state.json`, QA cutover plan | 🟢 Low — docs-only; no runtime impact |

---

## 7. Documentation / Source-of-Truth Summary

### Available Evaluation Reports

| Report | Location | Status |
|---|---|---|
| Cross-repo evaluation (primary source, 2026-05-03) | `hn3tdevops-jpg/Workforce-backup/docs/reports/WORKFORCE_CROSS_REPO_EVALUATION_REPORT_2026-05-03.md` | ✅ Authoritative — full read access during authoring |
| Showcase individual evaluation | `docs/reports/REPO_EVALUATION_REPORT.md` (this repo) | ✅ Present |
| Backup individual evaluation | `hn3tdevops-jpg/Workforce-backup/docs/reports/REPO_EVALUATION_REPORT.md` | ❌ MISSING — no such file |
| Console individual evaluation | `hn3tdevops-jpg/Workforce-Console/docs/reports/REPO_EVALUATION_REPORT.md` | ❌ MISSING — no reports directory |

### Best Source-of-Truth Docs

| Document | Location | Purpose |
|---|---|---|
| OpenAPI Spec | `lib/api-spec/openapi.yaml` (Showcase) | API contract — authoritative for generated types; partially out of date |
| RBAC Audit Index | `docs/rbac/RBAC_AUDIT_INDEX.md` (Workforce-backup) | Comprehensive RBAC implementation audit with scorecard |
| RBAC Implementation Audit | `docs/rbac/RBAC_IMPLEMENTATION_AUDIT.md` (Workforce-backup) | Line-by-line RBAC code audit |
| QA Cutover Plan | `docs/ADMIN/frontend/QA-cutover-plan.md` (Showcase) | Pre-production validation checklist |
| Frontend Progress Report | `docs/ADMIN/frontend/PROGRESS_REPORT_FRONTEND.md` (Showcase) | Current execution status and NO-GO record |
| Backend Cross-Repo Report | `docs/reports/WORKFORCE_CROSS_REPO_EVALUATION_REPORT_2026-05-03.md` (Workforce-backup) | Most detailed cross-repo evaluation |

### Stale / At-Risk Docs

| Document | Issue |
|---|---|
| `docs/plans/HN3T_MASTER_PLAN.md` (Showcase) | References `/home/hn3t/workforce/HN3T_MASTER_PLAN.md` — machine-local path |
| `.copilot_frontend/state.json` (Showcase) | References `active_repo: /home/hn3t/workforce_frontend_app` — machine-local path |
| `docs/ADMIN/frontend/QA-cutover-plan.md` (Showcase) | References `/home/hn3t/workforce_frontend_app/...` paths throughout |
| `lib/api-spec/openapi.yaml` (Showcase) | Describes `SessionInfo` shape that diverges from actual backend `MeResponse` |
| `render.yaml` (Workforce-backup) | `NEXT_PUBLIC_API_BASE_URL` targets a domain not in CORS allowlist |

### Missing Docs

| Missing Document | Why Needed |
|---|---|
| Individual `REPO_EVALUATION_REPORT.md` for Workforce-backup | No standalone evaluation of the Python backend repo |
| Individual `REPO_EVALUATION_REPORT.md` for Workforce-Console | No standalone evaluation of the Console devhub workspace |
| Deployment topology map | No single document maps each domain to its serving application |
| Permission/role naming reference | `DEFAULT_PERMISSIONS` in `roles_seed.py` not documented; frontend permission strings unverified against backend |
| Env var reference (`.env.example`) | No root-level file consolidating all required vars across packages |
| CORS policy spec | Backend CORS allowlist is hardcoded; no document describes how to add/modify allowed origins |

---

## 8. Top 10 Risks

| Rank | Risk | Repos Affected | Severity | Evidence | Recommended Fix |
|---|---|---|---|---|---|
| 1 | **`/auth/me/access-context` missing from Python backend** — `employmentScope` always `null` in production; `hasEmployeePermission()` always returns `false` | workforce-showcase, workforce-backup | 🔴 Critical | Workforce-backup `WORKFORCE_CROSS_REPO_EVALUATION_REPORT_2026-05-03.md` §4; Showcase `auth-context.tsx` catches error and silently sets `employmentScope = null` | Implement endpoint in Python backend, OR replace with `GET /me/effective-permissions` in Showcase auth flow |
| 2 | **16+ TypeScript errors in `lib/api-client-react`** — declaration files not built; frontend type safety broken | workforce-showcase | 🔴 High | `REPO_EVALUATION_REPORT.md` §4; `pnpm run typecheck` output | Run `pnpm --filter @workspace/api-client-react run build`; commit output; add to CI |
| 3 | **CI permanently failing in Showcase** — all recent runs fail on `pyproject.toml changed significantly since poetry.lock` | workforce-showcase | 🔴 High | GitHub Actions workflow runs on `master` branch | Update `poetry.lock` to match current `pyproject.toml`; fix CI |
| 4 | **`hospitable.db` committed to Showcase repo** — SQLite database with potentially real business/user data tracked in git | workforce-showcase | 🔴 High | `hospitable.db`, `hospitable.db-shm`, `hospitable.db-wal` visible at repo root | Add `*.db*` to `.gitignore`; purge from git history after auditing for real data |
| 5 | **Unauthenticated `/auth/reset` endpoint** in local proxy — anyone can set credentials for any email if api-server is reachable | workforce-showcase | 🔴 High | `artifacts/api-server/src/auth/router.ts`: `router.post("/reset", ...)` with no auth guard | Gate behind strong secret or remove from non-dev builds |
| 6 | **`render.yaml` embedded Next.js targets uncrossable API domain** — `api-hn3t.pythonanywhere.com` not in backend CORS allowlist; Next.js frontend would fail all API calls if deployed via Render | workforce-backup | 🔴 High | Workforce-backup `render.yaml`; backend `apps/api/app/main.py` CORS allowlist | Fix `render.yaml` to use `https://hn3t.pythonanywhere.com`, or add `api-hn3t.pythonanywhere.com` to CORS allowlist |
| 7 | **Dev SQLite backup files tracked in Workforce-backup git** — `dev.db.*.bak` files committed; may contain real data | workforce-backup | 🔴 High | Workforce-backup root: `dev.db.backup`, `dev.db.before-...`, `dev.db.pre_...` etc. | Add SQLite backup patterns to `.gitignore`; audit for real data; purge from history |
| 8 | **`/auth/me` shape drift** — spec, backend, and frontend have diverged response shape for `/auth/me`; frontend defensive mapping compensates but the spec is misleading | workforce-showcase, workforce-backup | 🟡 Medium | Showcase cross-repo report §4; backend `auth.py` `MeResponse`; spec `SessionInfo` | Canonicalize shape in spec and backend; remove outdated fields from spec |
| 9 | **Location owner delegation gap in RBAC** — any user with `roles:write` can assign roles at any location; master plan intended location-owner-only management | workforce-backup | 🟡 Medium | `docs/rbac/RBAC_AUDIT_INDEX.md`: `❌ rbac.location_roles.manage`, `❌ rbac.location_assignments.manage` | Implement location-owner delegation checks; add `rbac.location_roles.manage` permission |
| 10 | **Machine-local absolute paths in docs** — refs to `/home/hn3t/...` break in any other environment | workforce-showcase, workforce-console | 🟢 Low | `docs/plans/HN3T_MASTER_PLAN.md`, QA cutover plan, `.copilot_frontend/state.json` | Replace all absolute paths with repo-relative paths or GitHub permalink URLs |

---

## 9. Top 10 Recommended Next Actions

| Rank | Priority | Repo | Task | Why It Matters |
|---|---|---|---|---|
| 1 | 🔴 Critical | workforce-backup | Implement `GET /api/v1/auth/me/access-context` in Python backend (or deprecate in Showcase and wire `GET /me/effective-permissions` instead) | `employmentScope` is always `null` in production; permission checks are silently broken |
| 2 | 🔴 Critical | workforce-showcase | Build `lib/api-client-react` declaration files; fix TypeScript errors (target: 0 errors) | Prerequisite for a clean build and any production deployment |
| 3 | 🔴 Critical | workforce-showcase | Fix `poetry.lock` / `pyproject.toml` mismatch to restore CI; ensure first CI run passes | Without passing CI there is no automated quality gate |
| 4 | 🔴 Critical | workforce-showcase | Remove `hospitable.db*` from git tracking; add to `.gitignore`; audit for real data | Committed database files are a privacy and data integrity risk |
| 5 | 🔴 Critical | workforce-backup | Add dev SQLite backup files (`dev.db.*.bak`) to `.gitignore`; audit for real data; purge from history | Same risk as Showcase db files |
| 6 | 🔴 Critical | workforce-backup | Fix `render.yaml` `NEXT_PUBLIC_API_BASE_URL` — change from `api-hn3t.pythonanywhere.com` to `https://hn3t.pythonanywhere.com`, or add the domain to the backend CORS allowlist | Embedded Next.js frontend would fail all API calls if deployed via Render as-is |
| 7 | 🟡 High | workforce-showcase | Gate `/auth/reset` endpoint behind a strong secret or remove from non-dev builds | Unauthenticated credential override is a critical security risk if api-server is ever internet-accessible |
| 8 | 🟡 High | workforce-backup | Implement location-owner delegation RBAC checks (`rbac.location_roles.manage`); add audit logging for RBAC changes | Current RBAC allows any `roles:write` user to manage any location's roles — bypasses intended owner delegation |
| 9 | 🟡 High | workforce-showcase | Canonicalize `/auth/me` response shape between backend, spec, and frontend `mapToSessionInfo()`; align `business_id` vs `active_business_id` | Defensive mapping silently hides schema drift; one backend change could break auth |
| 10 | 🟢 Medium | All repos | Author individual `REPO_EVALUATION_REPORT.md` for Workforce-backup and Workforce-Console; replace machine-local absolute paths in docs with repo-relative paths | Cross-repo evaluation completeness and docs portability |

---

## Appendix A: Repository Profiles

### Workforce-backup (`hn3tdevops-jpg/Workforce-backup`, branch: `main`)

| Field | Value |
|---|---|
| Language/Runtime | Python 3.12, FastAPI, SQLAlchemy 2.x (async), Alembic |
| Package Manager | Poetry |
| Entry Point | `wsgi.py` → `apps/api/app/main.py` |
| Deploy Target | PythonAnywhere (`hn3t.pythonanywhere.com`) via `a2wsgi` |
| Canonical API Prefix | `/api/v1/` |
| Health Endpoint | `GET /health` → `{"status": "ok"}` |
| CORS Allowlist | `https://hn3t.pythonanywhere.com`, `https://wf-hn3t.pythonanywhere.com`, `http://localhost:5000`, `http://localhost:5173`, `http://localhost:3000` |
| Test Suite | 53 tests, all passing |
| CI | `backend-ci.yml` — partially running |
| Individual Evaluation Report | ❌ Missing |
| Key Docs | `docs/rbac/RBAC_AUDIT_INDEX.md`, `docs/rbac/RBAC_IMPLEMENTATION_AUDIT.md`, `docs/reports/WORKFORCE_CROSS_REPO_EVALUATION_REPORT_2026-05-03.md` |

### Workforce-Showcase (`hn3tdevops-jpg/Workforce-Showcase`, branch: `master`)

| Field | Value |
|---|---|
| Language/Runtime | TypeScript, React 19.1.0, Vite 7.x, Node.js ESM (api-server) |
| Package Manager | pnpm (workspace) |
| Frontend App Root | `artifacts/workforce-console/` |
| Deploy Target | PythonAnywhere via Flask `app.py` serving `dist/` |
| Production API | `https://hn3t.pythonanywhere.com` (`.env.production`) |
| CI | All recent runs failing (poetry.lock stale) |
| Individual Evaluation Report | ✅ `docs/reports/REPO_EVALUATION_REPORT.md` (2026-05-04) |

### Workforce-Console (`hn3tdevops-jpg/Workforce-Console`, branch: `docs/reconcile-backend-roots`)

| Field | Value |
|---|---|
| Language/Runtime | TypeScript, pnpm workspace |
| Purpose | Replit-based development/reconciliation workspace |
| Structure | `workforce_frontend_app/artifacts/workforce-console/`, `workforce_frontend_app/scripts/`, `docs/` |
| Last commit | "Hydrate effective permissions in auth context" (2026-04-29) |
| Deployability | Not an independent deployable; canonical artifact is in Showcase |
| Individual Evaluation Report | ❌ Missing — root `PROGRESS_REPORT.md` is a historical journal, not an evaluation report |

---

## Appendix B: Key Endpoint Inventory (Python Backend)

| Route | Method | Auth Required | Notes |
|---|---|---|---|
| `/health` | GET | No | `{"status": "ok"}` — note: no `/api/v1` prefix |
| `/api/v1/auth/login` | POST | No | Returns `{access_token, token_type, business_id, user{id,email,is_active}}`; 403 if no active membership |
| `/api/v1/auth/register` | POST | No | Creates user only (no membership); returns token with no `business_id` |
| `/api/v1/auth/me` | GET | Yes | Returns `{user{id,email,is_active}, business_id, memberships[{business_id,status,is_owner}], roles, permissions}` |
| `/api/v1/auth/switch-business` | POST | Yes | Returns `{access_token, token_type, business_id, roles, permissions}` |
| `/api/v1/auth/me/access-context` | GET | — | ❌ **Not implemented in Python backend** |
| `/api/v1/bootstrap` | POST | No | One-time server init: creates tenant/business/location/admin user — NOT a feature-flags endpoint |
| `/api/v1/me/businesses` | GET | Yes | Returns `[{id, name, is_default}]` |
| `/api/v1/me/effective-permissions` | GET | Yes | Returns sorted `string[]` of permission codes |
| `/api/v1/rooms` | GET/POST/… | Yes | — |
| `/api/v1/users` | GET/POST/… | Yes | — |
| `/api/v1/employees` | GET/POST/… | Yes | — |
| `/api/v1/tasks`, `/api/v1/assignments`, `/api/v1/shifts` | GET/POST/… | Yes | — |

