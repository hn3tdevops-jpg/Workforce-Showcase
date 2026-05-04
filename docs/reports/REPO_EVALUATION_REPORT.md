# Workforce-Showcase Repository Evaluation Report

**Generated:** 2026-05-04  
**Last validated:** 2026-05-04 (pnpm v10.33.2, Node 24)  
**Repository:** `hn3tdevops-jpg/Workforce-Showcase`  
**Report Author:** Copilot Agent (automated analysis)  
**Branch evaluated:** `copilot/create-evaluation-report-again`

### Validation commands run on this branch

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ Success (Done in 5.8s) |
| `pnpm run typecheck` | ✅ **0 errors** — all packages pass |
| `pnpm --filter @workspace/workforce-console run build` | ✅ **Build succeeded** (3143 modules, 8.74s) — sourcemap warnings only (non-fatal) |
| `pnpm exec playwright test --reporter=list` | 🔴 Not run — Chromium browser not installed in environment |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Repository Overview](#2-repository-overview)
3. [Architecture & Module Inventory](#3-architecture--module-inventory)
4. [TypeScript & Build Status](#4-typescript--build-status)
5. [API Contract Coverage](#5-api-contract-coverage)
6. [Security Analysis](#6-security-analysis)
7. [Test & CI/CD Status](#7-test--cicd-status)
8. [Dependency Health](#8-dependency-health)
9. [Documentation Health](#9-documentation-health)
10. [Risk Registry](#10-risk-registry)
11. [Recommended Next Actions](#11-recommended-next-actions)
12. [Appendix: File & Directory Map](#12-appendix-file--directory-map)

---

## 1. Executive Summary

### Overall Health: 🟡 PRE-PRODUCTION (build green, quality gates remain)

`workforce-showcase` is a **pnpm monorepo** that serves as the coordination hub for the Workforce platform. It contains a React/Vite frontend SPA (`artifacts/workforce-console`), a Node.js/Express local API proxy (`artifacts/api-server`), generated shared libraries (`lib/`), a static developer hub (`developer_hub/`), and extensive operational documentation (`docs/`).

As of this evaluation (2026-05-04) `pnpm install --frozen-lockfile`, `pnpm run typecheck` (0 errors), and `pnpm --filter @workspace/workforce-console run build` all pass cleanly. The CI workflow file is present; Playwright E2E execution remains unverified (browser not installed in evaluation environment). Production status remains **NOT GO** until the security and quality risks below are addressed.

### Production Readiness

⚠️ **Not yet ready.** Remaining blockers:
1. CI/CD workflow has not been observed to run successfully on the remote
2. `hospitable.db` SQLite database files committed to the repository root
3. Unauthenticated `/auth/reset` credential-override endpoint in the local API proxy
4. No confirmed CORS policy for the production backend (`hn3t.pythonanywhere.com`)
5. No unit or integration tests

### Health-at-a-Glance

| Area | Status | Notes |
|---|---|---|
| TypeScript / Build | ✅ Pass | `pnpm run typecheck` 0 errors; frontend Vite build succeeds (8.74s, 3143 modules) |
| CI/CD | 🔴 Unverified | Workflow file present; remote execution unconfirmed |
| Security | 🔴 Multiple issues | `localStorage` token, committed DB, unauthenticated reset endpoint |
| API Contract | 🟡 Partial | OpenAPI spec covers only 9 of ~20+ proxied routes |
| Documentation | 🟡 Partial | Good ops runbooks; machine-local paths; missing topology doc |
| Dependencies | ✅ Installed & modern | `pnpm install --frozen-lockfile` passes cleanly |
| Testing | 🔴 No passing tests | Playwright infra in place; Chromium not installed in evaluation environment |

---

## 2. Repository Overview

### Purpose

A full-stack **showcase monorepo** acting as the integration point between:
- A React/Vite frontend SPA used for the Workforce hospitality workforce management product
- A local Node.js/Express API proxy that adds SQLite-backed local overrides and routes specific domain areas to a remote PythonAnywhere backend
- Shared TypeScript libraries (generated API client, Zod schemas, Drizzle ORM schema)
- A static developer hub
- Comprehensive operational documentation and runbooks

### Technology Stack

| Layer | Technology |
|---|---|
| Package manager | pnpm (enforced by `preinstall` hook) |
| Node.js version | 24 (target; evaluation env used system Node) |
| TypeScript | ~5.9.2 |
| Frontend framework | React 19.1.0 |
| Frontend build | Vite 7.x |
| UI library | Radix UI + shadcn/ui component set (50+ components) |
| Styling | Tailwind CSS 4.x |
| State management | React Query (`@tanstack/react-query`) + Context API |
| API proxy runtime | Node.js 24 / Express 5 / ESM |
| Local data store | SQLite via `better-sqlite3` |
| PostgreSQL ORM | Drizzle ORM (lib/db — for upstream DB schema; not used locally) |
| API code generation | Orval (from OpenAPI 3.1 spec) |
| 3-D rendering | Three.js / `@react-three/fiber` (property-map page) |
| SPA serving | Flask (`app.py`) with SPA fallback |
| Test runner | Playwright 1.59.1 |

---

## 3. Architecture & Module Inventory

### 3.1 Monorepo Layout

```
workforce-showcase/
├── artifacts/
│   ├── api-server/          Node.js/Express local API proxy + SQLite auth layer
│   ├── workforce-console/   React/Vite frontend SPA
│   ├── mockup-sandbox/      (empty / placeholder)
│   └── operational/         Timestamped operational artifact archives
├── lib/
│   ├── api-spec/            OpenAPI 3.1 spec + Orval config
│   ├── api-client-react/    Generated React Query hooks (orval output)
│   ├── api-zod/             Generated Zod schemas (orval output)
│   └── db/                  Drizzle ORM schema + PostgreSQL migrations
├── developer_hub/           Static HTML developer hub (index.html + README)
├── docs/
│   ├── ADMIN/frontend/      Operational runbooks, cutover plan, progress report
│   ├── planning/            Planning templates and Copilot install pack
│   ├── plans/               Execution pointers (HN3T_MASTER_PLAN.md)
│   └── reports/             Evaluation reports (this file; cross-repo report)
├── scripts/                 Helper scripts (Playwright runner, restore, preview)
├── dist-staging/            Staging build of frontend SPA
├── app.py                   Flask SPA fallback server
├── .env.production          Production env vars (VITE_API_BASE_URL)
├── hospitable.db            ⚠️ SQLite DB committed to repo
├── hospitable.db-shm        ⚠️ SQLite shared-memory file committed to repo
├── hospitable.db-wal        ⚠️ SQLite WAL file committed to repo
├── playwright.config.ts     Playwright configuration
├── pnpm-workspace.yaml      pnpm workspace + catalog definitions
└── tsconfig.json            Root TypeScript project references
```

### 3.2 API Server Modules (`artifacts/api-server/src/`)

| Module | Mount Point | Description |
|---|---|---|
| `auth` | `/api/v1/auth` | Login, `/me`, `/me/access-context`, local credential overrides, session management |
| `hospitable` | `/api/v1/hospitable` | Rooms, reservations, tasks — served from local SQLite |
| `core` | `/api/v1` | Core proxied routes (rooms, tasks, assignments via upstream) |
| `scheduling` | `/api/v1` | Shift scheduling routes |
| `studio` | `/api/v1/studio` | AI-assisted workforce studio (projects, sessions, messages, modeling) |
| `promotions` | `/api/v1/promotions` | Promotion tier management; seeds tiers on startup |
| `workforce` | `/api/v1/workforce` | Employee/workforce management |
| `inspections` | `/api/v1/inspections` | Property inspections |
| `maintenance` | `/api/v1/maintenance` | Maintenance requests and work orders |
| `inventory` | `/api/v1/inventory` | Inventory tracking |
| `notifications` | `/api/v1/notifications` | Notification delivery |
| `communications` | `/api/v1/communications` | Internal message threads |
| `admin` | `/api/v1/admin` | Admin tooling |
| `routes/health` | `/api/healthz` | Health check |
| **Catch-all proxy** | `/api/v1/*` | Forwards unmatched requests to `hn3t.pythonanywhere.com` |

### 3.3 Frontend Pages (`artifacts/workforce-console/src/pages/`)

| Page | Route (inferred) | Description |
|---|---|---|
| `login.tsx` | `/login` | Email/password login |
| `register.tsx` | `/register` | User registration |
| `business-register.tsx` | `/business-register` | Business onboarding |
| `bootstrap.tsx` | `/bootstrap` | Post-login bootstrapping |
| `dashboard.tsx` | `/` | KPI dashboard |
| `employees.tsx` | `/employees` | Employee directory & profiles |
| `shifts.tsx` | `/shifts` | Shift scheduling (57 KB — largest page) |
| `assignments.tsx` | `/assignments` | Task/room assignments |
| `tasks.tsx` | `/tasks` | Task management |
| `rooms.tsx` | `/rooms` | Room inventory |
| `communications.tsx` | `/communications` | Internal messaging |
| `promotions.tsx` | `/promotions` | Promotion tiers |
| `inspections.tsx` | `/inspections` | Inspections |
| `inventory.tsx` | `/inventory` | Inventory |
| `maintenance.tsx` | `/maintenance` | Maintenance requests |
| `timeline.tsx` | `/timeline` | Timeline view |
| `property-map.tsx` | `/property-map` | 3-D property map (Three.js; 38 KB) |
| `studio.tsx` | `/studio` | AI-powered workforce studio (96 KB — heaviest page) |
| `users.tsx` | `/users` | User management |
| `settings.tsx` | `/settings` | Account settings |
| `invite.tsx` | `/invite` | Team invitations |
| `session.tsx` | `/session` | Session debug/inspection |
| `not-found.tsx` | `*` | 404 fallback |

### 3.4 Frontend Libraries Used

- **UI primitives:** Radix UI (20+ packages) with shadcn/ui conventions (`components/ui/`, ~58 components)
- **Forms:** `react-hook-form` + `@hookform/resolvers` + `zod`
- **Data fetching:** `@tanstack/react-query`
- **Routing:** `wouter` (lightweight hash/history router)
- **Date handling:** `date-fns`
- **Charts:** `recharts`
- **Animation:** `framer-motion`
- **3-D:** `@react-three/fiber`, `@react-three/drei`, `three`
- **OTP input:** `input-otp`
- **Carousel:** `embla-carousel-react`
- **Themes:** `next-themes`
- **Toast:** `sonner`
- **Icons:** `lucide-react`, `react-icons`

---

## 4. TypeScript & Build Status

### 4.1 Typecheck Status (validated 2026-05-04)

**Result: ✅ PASS — 0 errors**

Running `pnpm install --frozen-lockfile` followed by `pnpm run typecheck` on this branch produces **zero errors** across all packages:

```
> workspace@0.0.0 typecheck:libs
> tsc --build

> artifacts/api-server typecheck: Done
> artifacts/mockup-sandbox typecheck: Done
> artifacts/workforce-console typecheck: Done
> scripts typecheck: Done
```

The previous session recorded 16+ errors caused by missing `node_modules`. Those errors were resolved once dependencies were installed with `pnpm install --frozen-lockfile`.

### 4.2 Frontend Build Status (validated 2026-05-04)

**Result: ✅ PASS**

```
pnpm --filter @workspace/workforce-console run build
```

Output:
```
vite v7.3.1 building client environment for production...
✓ 3143 modules transformed.
dist/public/index.html                     0.74 kB │ gzip:   0.41 kB
dist/public/assets/index-DuUXifR-.css    172.40 kB │ gzip:  25.35 kB
dist/public/assets/index-dxQeWSzd.js   2,067.84 kB │ gzip: 579.23 kB
✓ built in 8.74s
```

**Non-fatal warnings only** (do not block the build):
- Sourcemap resolution warnings for several Radix UI + shadcn/ui component files (upstream issue in those packages)
- Bundle size warning: main JS chunk is 2,067 KB (>500 KB threshold) — see A-16 below

### 4.4 Build Pipeline (scripts)

```
pnpm run typecheck         → tsc --build (project references)
                           → pnpm -r --filter ./artifacts/** typecheck
pnpm run build             → pnpm run typecheck
                           → pnpm -r --if-present run build
```

- `artifacts/api-server` builds via `esbuild` to `dist/index.mjs`
- `artifacts/workforce-console` builds via `vite build` to `dist/public/`

### 4.5 TypeScript Strictness Configuration

From `tsconfig.base.json`:
- `noImplicitAny: true` ✅
- `strictNullChecks: true` ✅
- `noImplicitThis: true` ✅
- `useUnknownInCatchVariables: true` ✅
- `strictFunctionTypes: false` ⚠️ — function contravariance not checked
- `noUnusedLocals: false` ⚠️ — dead code not flagged
- `skipLibCheck: true` — declaration errors in `node_modules` skipped

The configuration is moderately strict. Enabling `strictFunctionTypes` and `noUnusedLocals` would improve safety at the cost of more remediation work.

---

## 5. API Contract Coverage

### 5.1 OpenAPI Specification Coverage

The spec at `lib/api-spec/openapi.yaml` covers **9 paths** (613 lines):

| Path | Operations | In Vite Proxy |
|---|---|---|
| `/healthz` | GET | — |
| `/v1/auth/login` | POST | ✅ via `/api/v1` |
| `/v1/auth/me` | GET | ✅ |
| `/v1/auth/me/memberships` | GET | ✅ |
| `/v1/auth/switch-business` | POST | ✅ |
| `/v1/rooms` | GET, POST | ✅ |
| `/v1/tasks` | GET, POST | ✅ |
| `/v1/assignments` | GET, POST | ✅ |
| `/v1/shifts` | GET, POST | ✅ |

**Routes proxied by Vite but absent from spec:**

`/api/v1/hospitable`, `/api/v1/business`, `/api/v1/studio`, `/api/v1/promotions`, `/api/v1/workforce`, `/api/v1/inspections`, `/api/v1/maintenance`, `/api/v1/inventory`, `/api/v1/notifications`, `/api/v1/admin`

This means **more than half** of the application's API surface has no formal contract, no generated types, and no contract tests.

### 5.2 Auth Contract Alignment

| Endpoint | Spec | Frontend | Proxy | Status |
|---|---|---|---|---|
| `POST /auth/login` body | `{ email, password }` | `{ email, password, business_id: null }` | Passes through | 🟡 Extra field `business_id` not in spec |
| `POST /auth/login` response | `{ access_token, token_type }` | Reads `access_token` | Returns `{ access_token, token_type: "bearer" }` | ✅ Aligned |
| `GET /auth/me` response | `SessionInfo` flat shape | Tolerates flat **and** nested `{ user: {...} }` | Flat | 🟡 Dual-shape handling is a workaround |
| `/auth/me/access-context` | ❌ Not in spec | Called; failure silently swallowed | Implemented locally | 🔴 Unspecified; upstream support unknown |
| `is_active`, `is_superadmin` | ❌ Not in spec | Read from response | `is_active` set locally; `is_superadmin` not set | ⚠️ May be missing from upstream |

### 5.3 RBAC / Permission Strings

Frontend uses permission strings (`"owner:*"`, `"business:owner"`, `"superadmin:*"`) and role names (`"owner"`, `"admin"`) that are **not defined in the OpenAPI spec**. There is no canonical list of valid permission strings. Client-side RBAC enforcement is unverified against server-side enforcement.

---

## 6. Security Analysis

### 6.1 Authentication Token Storage

**Risk: 🔴 High**

`workforce_token` is stored in `localStorage`:

```typescript
// src/lib/api-client.ts
localStorage.getItem("workforce_token")

// src/lib/auth-context.tsx
localStorage.setItem("workforce_token", data.access_token)
```

`localStorage` is accessible to any JavaScript running on the page, making this vulnerable to **XSS attacks**. A successful XSS injection could exfiltrate the token and allow an attacker to impersonate the user.

**Recommended fix:** Migrate to `sessionStorage` (slightly better XSS isolation) or `httpOnly` cookies (XSS-immune, requires server-side session management).

### 6.2 Committed Database Files

**Risk: 🔴 High**

Three SQLite-related files are tracked in git:
- `hospitable.db`
- `hospitable.db-shm`
- `hospitable.db-wal`

These are **not** in `.gitignore`. If these files contain real business or user data (emails, credentials, PII) they constitute a **data exposure event** in the git history.

**Recommended fix:**
1. Audit `hospitable.db` for sensitive data immediately.
2. Add `*.db`, `*.db-shm`, `*.db-wal` to `.gitignore`.
3. If sensitive data is present, purge files from git history with `git filter-repo` and rotate any exposed credentials.

### 6.3 Unauthenticated Credential Override Endpoint

**Risk: 🟡 Medium**

`POST /auth/reset` (in `artifacts/api-server/src/auth/router.ts`) allows anyone to create or replace a local credential override for any email address with no authentication guard:

```typescript
router.post("/reset", (req, res) => {
  // no auth check — anyone can call this
  const { email, password } = req.body ?? {};
  // ... stores hashed password in local_credential_overrides table
});
```

If `api-server` is ever deployed to a production-accessible host (e.g., as a sidecar), this endpoint allows account takeover for any user who has a local override.

**Recommended fix:** Gate the endpoint behind a strong pre-shared secret header check, or compile-time exclude it from non-development builds.

### 6.4 Hardcoded Business ID

**Risk: 🟡 Medium**

`SILVER_SANDS_BUSINESS_ID = "biz-silver-sands"` is hardcoded in `artifacts/api-server/src/auth/router.ts`. All local credential overrides and sessions are scoped to this single business. This is appropriate for development but must be parameterized before any multi-tenant or non-Silver-Sands deployment.

### 6.5 Production CORS

**Risk: 🔴 High**

In production, the frontend SPA (served from a PythonAnywhere domain) makes cross-origin `fetch` calls to `https://hn3t.pythonanywhere.com`. No CORS policy is observable from this repository. If `Access-Control-Allow-Origin` is not configured on the backend for the frontend domain, all production API calls will fail with CORS errors.

**Recommended fix:** Verify CORS headers on `hn3t.pythonanywhere.com` and document the allowed-origins list. Ensure the production frontend domain is in the allow-list.

### 6.6 Unvalidated Proxy Pass-Through

**Risk: 🟡 Medium**

The api-server catch-all proxy (`app.ts` lines 65–103) forwards all unmatched `/api/v1/*` requests to `https://hn3t.pythonanywhere.com` verbatim, including the `Authorization` header. There is no:
- Request size limit
- Schema validation
- Rate limiting
- Logging of full request bodies

This means the proxy could be used to relay malformed or oversized requests to the upstream backend.

### 6.7 Developer Hub Public Exposure

**Risk: 🟢 Low**

`developer_hub/index.html` is a static page intended for developer reference. If it links to internal endpoints, credential reset pages, or sensitive documentation, it should not be publicly accessible. Review before deployment.

---

## 7. Test & CI/CD Status

### 7.1 CI Workflows

| Workflow File | Status | Notes |
|---|---|---|
| `.github/workflows/playwright-browser-validation.yml` | 🔴 Never ran on remote | Push was blocked — PAT lacked `workflow` scope |
| `.github/workflows/playwright-ci.yml` | ⚠️ Unknown | Present; whether it has ever run is unverified |

The `playwright-browser-validation.yml` workflow:
- Runs `workflow_dispatch` only (no push/PR trigger)
- Checks out the repo, installs Playwright Chromium, starts a Python static server on `dist-staging/`, runs `scripts/playwright-run.cjs`, checks results with `scripts/check-playwright-results.cjs`
- Uploads `playwright-or-browser-test-log.txt`, `browser-console-errors.txt`, `failed-network-requests.txt`, `route-validation-summary.md`, and `screenshots/` as artifacts

### 7.2 Local Test Execution

All local Playwright attempts have failed:
- **On-host:** Browser process exited during startup (SIGTRAP — missing system libraries)
- **Docker:** `docker: command not found` in the evaluation environment
- **CI:** Never triggered remotely

### 7.3 Unit Tests

No unit test framework (Jest, Vitest, etc.) is configured. No `test` script exists at the workspace root or in any package. **There are zero unit tests.**

### 7.4 Contract Tests

No contract tests exist. The OpenAPI spec is only used for code generation; there is no runtime validation that the spec matches the live backend.

### 7.5 Test Coverage Summary

| Test Type | Status |
|---|---|
| Unit tests | ❌ None |
| Integration tests | ❌ None |
| Contract tests | ❌ None |
| E2E / browser tests (Playwright) | 🔴 Infrastructure present; never executed successfully |

---

## 8. Dependency Health

### 8.1 Core Dependency Versions

| Package | Version | Notes |
|---|---|---|
| React | 19.1.0 | Latest stable |
| TypeScript | ~5.9.2 | Latest stable series |
| Vite | ~7.3.0 | Latest major |
| Tailwind CSS | ~4.1.14 | Latest major |
| Express | ^5 | Express 5 (current) |
| Drizzle ORM | ^0.45.1 | Current |
| `@tanstack/react-query` | ^5.90.21 | Current |
| `better-sqlite3` | ^12.8.0 | Current |
| Three.js | ^0.183.2 | Current |
| Playwright | 1.59.1 | Current |

The dependency set is **modern and up-to-date**.

### 8.2 Concerns

- `catalog:` placeholders for internal/registry packages — require registry access during install; may fail in fresh CI environments without configuration
- `framer-motion` is pinned to `12.35.1` (catalog) — verify this is intentional
- `@replit/vite-plugin-*` dependencies are Replit-specific and will be no-ops outside Replit; they add unnecessary build weight in production
- `three` / `@react-three/*` add ~600 KB+ to the bundle; tree-shaking should be verified

### 8.3 `node_modules` Status

`node_modules` is fully installed in this evaluation environment. `pnpm install --frozen-lockfile` completed successfully in 5.8s with pnpm v10.33.2. The `catalog:` placeholders resolved correctly from the workspace catalog defined in `pnpm-workspace.yaml`.

---

## 9. Documentation Health

### 9.1 Available Documentation

| Document | Location | Quality |
|---|---|---|
| Cross-repo evaluation report | `docs/reports/WORKFORCE_CROSS_REPO_EVALUATION_REPORT.md` | ✅ Comprehensive |
| This repo evaluation report | `docs/reports/REPO_EVALUATION_REPORT.md` | ✅ (this document) |
| Frontend progress report | `docs/ADMIN/frontend/PROGRESS_REPORT_FRONTEND.md` | ✅ Detailed |
| QA / cutover plan | `docs/ADMIN/frontend/QA-cutover-plan.md` | ✅ Gate-based |
| Frontend deploy README | `docs/ADMIN/frontend/README.frontend-deploy.md` | ✅ Operational |
| Rollback runbook | `docs/ADMIN/frontend/ROLLBACK_TO_OPERATIONAL_ARTIFACT.md` | ✅ |
| Off-host Playwright runbook | `docs/ADMIN/frontend/OFF_HOST_PLAYWRIGHT_RUNBOOK.md` | ✅ |
| CORS verification checklist | `docs/ADMIN/frontend/CORS_VERIFICATION_CHECKLIST.md` | ✅ |
| CI trigger attempt log | `docs/ADMIN/frontend/CI_TRIGGER_ATTEMPT.md` | 🟡 Historical record |
| OpenAPI spec | `lib/api-spec/openapi.yaml` | 🟡 Partial coverage |
| replit.md | `replit.md` | ✅ Architecture overview |
| Master plan | `docs/plans/HN3T_MASTER_PLAN.md` | ⚠️ References machine-local paths |

### 9.2 Documentation Issues

| Issue | Severity | Affected Files |
|---|---|---|
| Machine-local absolute paths (`/home/hn3t/...`) | 🟡 Medium | `docs/plans/HN3T_MASTER_PLAN.md`, `.copilot_frontend/state.json`, `docs/ADMIN/frontend/QA-cutover-plan.md` |
| No deployment topology document | 🟡 Medium | Missing — no single doc maps each domain to its serving application |
| No root `.env.example` consolidating all required vars | 🟡 Medium | Missing — `PORT`, `BASE_PATH`, `VITE_API_BASE_URL`, `VITE_DEMO_MODE` scattered |
| No CORS policy specification | 🔴 High | Missing — required before production deployment |
| No permission/role naming conventions document | 🟡 Medium | Missing — frontend uses convention strings not in spec |
| `route-validation-summary.md` duplicated | 🟢 Low | Repo root AND `docs/ADMIN/frontend/artifact-diffs/` |
| `workforce-backup` and standalone `workforce-console` evaluation reports absent | 🟡 Medium | These repos were not accessible at evaluation time |

---

## 10. Risk Registry

| # | Risk | Category | Severity | Evidence | Status |
|---|---|---|---|---|---|
| R-01 | `localStorage` token storage — XSS-vulnerable | Security | 🔴 High | `src/lib/api-client.ts`, `src/lib/auth-context.tsx` | Open |
| R-02 | `hospitable.db*` committed to git — potential data exposure | Security / Privacy | 🔴 High | `hospitable.db`, `hospitable.db-shm`, `hospitable.db-wal` in repo root | Open |
| R-03 | Unauthenticated `/auth/reset` endpoint | Security | 🟡 Medium | `artifacts/api-server/src/auth/router.ts` | Open |
| R-04 | No confirmed CORS for production backend | Security / Availability | 🔴 High | `.env.production` → `hn3t.pythonanywhere.com`; CORS unverified | Open |
| R-05 | Large JS bundle (2,067 KB) — no code splitting | Performance | 🟡 Medium | Vite build output: `dist/public/assets/index-dxQeWSzd.js 2,067 KB` | Open |
| R-06 | CI workflow never executed on remote | Quality Gate | 🔴 High | `PROGRESS_REPORT_FRONTEND.md`; PAT scope failure | Open |
| R-07 | No unit or integration tests | Quality | 🔴 High | No `test` scripts anywhere in workspace | Open |
| R-08 | OpenAPI spec covers only 9 of ~20+ proxied routes | Contract Drift | 🟡 Medium | `lib/api-spec/openapi.yaml` vs `vite.config.ts` proxy map | Open |
| R-09 | Hardcoded `SILVER_SANDS_BUSINESS_ID` in api-server | Configuration | 🟡 Medium | `artifacts/api-server/src/auth/router.ts:25` | Open |
| R-10 | Machine-local absolute paths in docs | Portability | 🟢 Low | `docs/plans/HN3T_MASTER_PLAN.md`, `.copilot_frontend/state.json` | Open |
| R-11 | No deployment topology document — domain → app mapping unclear | Operations | 🟡 Medium | Missing document | Open |
| R-12 | Large JS bundle (2,067 KB minified) — no code splitting configured | Performance | 🟡 Medium | Vite build output on 2026-05-04 | Open |
| R-13 | Rollback rehearsal not completed | Operations | 🟡 Medium | `PROGRESS_REPORT_FRONTEND.md` | Open |
| R-14 | No rate limiting on api-server proxy pass-through | Security | 🟡 Medium | `artifacts/api-server/src/app.ts` catch-all | Open |
| R-15 | `workforce-backup` and standalone `workforce-console` states unknown | Cross-repo | 🟡 Medium | Repos inaccessible at evaluation time | Open |

---

## 11. Recommended Next Actions

| Priority | ID | Task | Rationale |
|---|---|---|---|
| 🔴 Critical | A-01 | Trigger CI workflow on this branch to get a first passing run — confirm Playwright spec passes | No automated quality gate until CI executes successfully |
| 🔴 Critical | A-02 | Add `*.db`, `*.db-shm`, `*.db-wal` to `.gitignore`; audit `hospitable.db` for sensitive data; purge from git history if needed | Data exposure and privacy risk |
| 🔴 Critical | A-03 | Confirm CI workflow executes on remote and first run passes (pnpm install + typecheck + build + Playwright) | No automated quality gate exists until CI runs |
| 🔴 Critical | A-04 | Verify and document `Access-Control-Allow-Origin` policy on `hn3t.pythonanywhere.com` | Production frontend will fail all API calls without this |
| 🔴 Critical | A-05 | Migrate `workforce_token` from `localStorage` to `sessionStorage` or `httpOnly` cookies | XSS-resilient token storage |
| 🟡 High | A-06 | Gate `/auth/reset` endpoint behind a secret or exclude from non-dev builds | Prevents unauthorized credential override if api-server reaches production |
| 🟡 High | A-07 | Parameterize `SILVER_SANDS_BUSINESS_ID` via environment variable | Required for any non-Silver-Sands deployment |
| 🟡 High | A-08 | Expand `lib/api-spec/openapi.yaml` to cover all proxied routes (`/workforce`, `/inspections`, `/maintenance`, `/inventory`, `/studio`, `/promotions`, `/admin`, `/notifications`, `/business`, `/hospitable`) | Enables generated types, contract tests, and API documentation for the full surface |
| 🟡 High | A-09 | Complete rollback rehearsal against `dist-staging` using `scripts/restore_operational_artifact.sh` | Required before production cutover; documented as mandatory gate |
| 🟡 High | A-10 | Create root-level `.env.example` consolidating all required environment variables | Developer experience; prevents missing-env-var build failures |
| 🟡 High | A-11 | Create deployment topology document mapping each domain to its serving application and CORS requirements | Operational clarity required for safe production deployment |
| 🟢 Medium | A-12 | Replace machine-local absolute paths in docs with repo-relative paths or GitHub permalink URLs | Docs must work in all environments (CI, new developer machines, other repos) |
| 🟢 Medium | A-13 | Add a Vitest or equivalent unit test suite for critical utilities (`auth-context.tsx`, `api-client.ts`, auth router logic) | Zero test coverage is a long-term quality risk |
| 🟢 Medium | A-14 | Canonicalize the `/auth/me` response shape and document the permission/role naming convention | Reduces RBAC mismatch risk between frontend and backend |
| 🟢 Medium | A-15 | Add rate limiting middleware to api-server proxy (e.g., `express-rate-limit`) | Prevents proxy abuse and potential DoS amplification to upstream |

---

## 12. Appendix: File & Directory Map

```
workforce-showcase/
├── .copilot_exec/
├── .copilot_frontend/
│   └── state.json                  ⚠️ Machine-local active_repo path
├── .env.production                 VITE_API_BASE_URL=https://hn3t.pythonanywhere.com
├── .github/
│   └── workflows/
│       ├── playwright-browser-validation.yml  🔴 Never ran on remote
│       └── playwright-ci.yml
├── .gitignore                      ⚠️ Does not exclude *.db files
├── .npmrc
├── .replit / .replitignore
├── app.py                          Flask SPA fallback server (PORT/FRONTEND_DIST_DIR)
├── artifacts/
│   ├── api-server/
│   │   ├── src/
│   │   │   ├── app.ts              Express app; 13 routers + catch-all proxy
│   │   │   ├── auth/router.ts      ⚠️ Unauthenticated /reset; hardcoded biz ID
│   │   │   ├── hospitable/db.ts    SQLite connection (better-sqlite3)
│   │   │   ├── studio/             AI studio (projects, sessions, modeling, artifacts)
│   │   │   └── [10 other modules]
│   │   ├── build.mjs               esbuild build script
│   │   └── package.json
│   ├── operational/                Timestamped build archives (rollback source)
│   └── workforce-console/
│       ├── src/
│       │   ├── App.tsx             Root component + route definitions
│       │   ├── lib/
│       │   │   ├── api-client.ts   HTTP client; localStorage token
│       │   │   ├── auth-context.tsx AuthProvider; login/logout; RBAC helpers
│       │   │   ├── mock-adapter.ts  Demo mode mock data adapter
│       │   │   └── [other libs]
│       │   ├── pages/              23 page components
│       │   ├── components/
│       │   │   ├── layout/         AppSidebar, TopNav, Shell
│       │   │   └── ui/             ~58 shadcn/ui components
│       │   ├── hooks/              useToast, useIsMobile, etc.
│       │   └── modules/
│       │       └── project-manager/ Project manager module
│       ├── vite.config.ts          Build config; proxy map; PORT/BASE_PATH required
│       └── package.json
├── browser-console-errors.txt      Playwright artifact (committed)
├── developer_hub/
│   ├── index.html                  Static developer hub
│   └── README.md
├── dist-staging/                   Staging build of frontend SPA
├── docs/
│   ├── ADMIN/frontend/             Operational runbooks
│   ├── planning/                   Templates / Copilot install pack
│   ├── plans/HN3T_MASTER_PLAN.md   ⚠️ Machine-local paths
│   └── reports/
│       ├── REPO_EVALUATION_REPORT.md                  ← this file
│       ├── WORKFORCE_CROSS_REPO_EVALUATION_REPORT.md
│       └── WORKFORCE_CROSS_REPO_EVALUATION_FIX_REPORT.md
├── failed-network-requests.txt     Playwright artifact (committed)
├── hospitable.db                   ⚠️ SQLite DB — should not be committed
├── hospitable.db-shm               ⚠️
├── hospitable.db-wal               ⚠️
├── lib/
│   ├── api-client-react/           Generated React Query hooks (orval)
│   ├── api-spec/openapi.yaml       OpenAPI 3.1 spec (9 paths, partial)
│   ├── api-zod/                    Generated Zod schemas (orval)
│   └── db/                         Drizzle ORM + PostgreSQL schema
├── package.json                    Workspace root; preinstall enforces pnpm
├── playwright.config.ts
├── playwright-or-browser-test-log.txt  Playwright artifact (committed)
├── pnpm-lock.yaml
├── pnpm-workspace.yaml             Workspace packages + catalog
├── replit.md                       Architecture overview (Replit-oriented)
├── route-validation-summary.md     ⚠️ Duplicate of docs/ADMIN/frontend/artifact-diffs/
├── scripts/
│   ├── check-playwright-results.cjs
│   ├── playwright-run.cjs / .js
│   ├── playwright-runner.Dockerfile
│   ├── restore_operational_artifact.sh
│   ├── preview_frontend.sh
│   ├── run_plan.sh
│   └── post-merge.sh
├── tsconfig.base.json              Shared compiler options
└── tsconfig.json                   Project references (lib/db, lib/api-client-react, lib/api-zod)
```

| 🟢 Medium | A-16 | Split the Vite bundle using dynamic `import()` or `build.rollupOptions.output.manualChunks` to bring chunks below 500 KB | 2,067 KB main chunk significantly impacts load time on slow connections |

---

*This report was generated by automated analysis of the `workforce-showcase` repository (branch: `copilot/create-evaluation-report-again`) on 2026-05-04. Build and typecheck results were validated by running `pnpm install --frozen-lockfile`, `pnpm run typecheck`, and `pnpm --filter @workspace/workforce-console run build` on 2026-05-04 with pnpm v10.33.2. It supersedes the placeholder entry in `WORKFORCE_CROSS_REPO_EVALUATION_REPORT.md` for this repo's individual evaluation.*
