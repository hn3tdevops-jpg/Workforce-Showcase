# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

# Workforce Frontend Demo

## Goal
Build a demo-ready frontend for Workforce that proves:

1. Workforce user administration
2. Hospitable room and task operations

This frontend is for demonstration, but it should still feel like a real internal operations product.

## Recommended stack
- React
- TypeScript
- Vite

## Design goals
- dark mode first
- clean operational dashboard feel
- responsive for desktop and tablet
- fast, simple workflows
- reusable components
- clear business and location context throughout the app

## Product structure

### Workforce owns
- user administration
- roles
- permissions
- business context
- location context

### Hospitable inside Workforce owns
- room views
- room status
- task views
- task assignment
- task status updates
- inspections and issues if backend is ready

## Required screens

### 1. Dashboard
Show:
- room counts by status
- task counts by status
- selected business and location
- optional recent activity list if available

### 2. Users
Show:
- user table
- scoped role assignments
- job title label as display-only
- role assignment modal or drawer

### 3. Rooms
Show:
- room list or grid by selected location
- status badges
- room details drawer or modal
- simple room edit capability if backend supports it

### 4. Tasks
Show:
- task list grouped by status
- assign task action
- update task status action
- room reference and assignee display

## App shell
Create:
- top navigation
- sidebar
- business selector
- location selector

The selected business and location should drive the data shown on dashboard, rooms, and tasks screens.

## Technical rules
- Use environment variable `VITE_API_BASE_URL`
- Put API calls in a dedicated API client layer
- Use typed interfaces for server responses
- Use reusable UI components
- Keep routing simple and clear
- Add loading, empty, and error states
- Prefer maintainable structure over over-engineering

## Mock mode requirement
If some backend endpoints are not ready yet:
- preserve the real API shapes
- implement a mock adapter with the same response structure
- make it easy to switch between mock and live API

Suggested approach:
- `src/lib/api/` for live API functions
- `src/lib/mock/` for mock data and mock service functions
- `src/config/` for environment and feature toggles

## Data contract targets

### Users / RBAC
- GET /users
- GET /roles
- POST /users/{id}/assignments
- DELETE /users/{id}/assignments/{assignment_id}

### Rooms
- GET /locations/{location_id}/rooms
- POST /locations/{location_id}/rooms
- PATCH /rooms/{room_id}

### Tasks
- GET /locations/{location_id}/tasks
- POST /locations/{location_id}/tasks
- POST /tasks/{task_id}/assign
- POST /tasks/{task_id}/status

### Dashboard
- GET /locations/{location_id}/dashboard-summary

## Visual rules
- dark background
- clear elevated cards
- readable tables
- compact but not cramped spacing
- obvious status color treatment
- admin-product feel, not consumer app feel

## Suggested folder structure
- `src/app/`
- `src/components/`
- `src/features/dashboard/`
- `src/features/users/`
- `src/features/rooms/`
- `src/features/tasks/`
- `src/lib/api/`
- `src/lib/mock/`
- `src/context/`
- `src/types/`

## Build order
1. app shell and routing
2. business and location context
3. dashboard page
4. users page
5. rooms page
6. tasks page
7. mock/live API toggle cleanup

## Demo data expectations
If mock mode is used, seed:
- 1 business
- 2 locations
- 6 users
- 10 to 20 rooms
- 8 to 12 active tasks
- mixed room statuses
- mixed task statuses
- 1 maintenance hold
- 1 failed inspection if inspection support is present

## Final expectation
The demo should support this flow:
1. Admin views users
2. Admin assigns a scoped role
3. Manager views rooms for a location
4. Manager assigns a room task
5. Housekeeper moves task to in progress and then completed
6. Dashboard reflects the result

## Backend API — Connection & Auth

### Live API
The live API is deployed at `https://hn3t.pythonanywhere.com` (Python FastAPI + SQLite via PythonAnywhere).

**Auth endpoints:**
- `POST /api/v1/auth/login` → `{ access_token, token_type, business_id, user: { id, email, is_active } }`
- `GET /api/v1/auth/me` → `{ user: { id, email, is_active }, business_id, memberships: [{ business_id, status, is_owner }], roles, permissions }`
- `POST /api/v1/auth/switch-business` → `{ access_token, token_type, business_id, roles, permissions }`

**Important:** The API returns a nested response shape (`user.id`, `user.email` etc.) which `auth-context.tsx` maps to the flat `SessionInfo` type the console uses. The mapping is in `mapToSessionInfo()` in `src/lib/auth-context.tsx`.

### Dev proxy (recommended)
In development, leave `VITE_API_BASE_URL` empty in `.env`. The Vite dev server proxies all `/api/v1/*` requests to `https://hn3t.pythonanywhere.com`, eliminating browser CORS restrictions.

### Direct connection
Set `VITE_API_BASE_URL=https://hn3t.pythonanywhere.com` in `.env`. Requires the PythonAnywhere server to have CORS configured for the Replit domain via `CORS_ALLOW_ORIGINS` env var.

### Token storage
The access token is stored as `workforce_token` in localStorage. The API's `/auth/me` is called on page load to rehydrate the session.

### Role names
The API returns role names with capital first letter (e.g., `"Owner"`, `"Manager"`). `hasRole()` and `isOwner()` do case-insensitive comparison.

### `business_name` gap
The `/auth/me` endpoint does not include `business_name` in memberships. The console handles this with a fallback to `business_id` in the UI. If `business_name` is populated (e.g., from demo mode), it displays normally.

### Demo mode
Set `VITE_DEMO_MODE=true` to bypass all API calls and use Silver Sands mock data. Useful for UI development without a live API.

## Hospitable Module — Local API Server

The Hospitable module (property hierarchy, rooms, HK tasks, maintenance issues, dashboard) is implemented in the local Express API server (`artifacts/api-server`) using a SQLite database seeded with Silver Sands Motel data.

### Architecture

The Vite dev-server proxy splits traffic by path:
- `/api/v1/hospitable/*` → `http://localhost:8080` (local Express server)
- `/api/v1/*` → `https://hn3t.pythonanywhere.com` (PythonAnywhere FastAPI)

This means auth, bootstrap, users, etc. still hit the live Python backend, while all property/room/task operations hit the local Node.js backend.

### Source files

- `artifacts/api-server/src/hospitable/db.ts` — SQLite schema init + Silver Sands seed (1 building, 1 floor, 2 sectors, 12 rooms, 9 tasks, 3 maintenance issues)
- `artifacts/api-server/src/hospitable/router.ts` — all route handlers

### Database

- Path: `artifacts/api-server/hospitable.db` (SQLite, created on first run)
- Seeded with Silver Sands Motel: Building 1, Floor 1, North Side (rooms 7-12), South Side (rooms 1-6)
- Seed only runs once (checked by counting buildings)

### Endpoints (all at `/api/v1/hospitable/`)

| Method | Path | Description |
|---|---|---|
| GET | `/locations/:id/property-tree` | Full building → floor → sector hierarchy |
| POST | `/buildings` | Create a building |
| POST | `/floors` | Create a floor |
| POST | `/sectors` | Create a sector |
| GET | `/locations/:id/room-groups` | List room groups for a location |
| POST | `/room-groups` | Create a room group |
| GET | `/rooms?location_id=` | List rooms (filterable by hk status, sector) |
| POST | `/rooms` | Create a room |
| GET | `/rooms/:id` | Get a single room |
| PATCH | `/rooms/:id/status` | Update housekeeping/occupancy/inspection status |
| POST | `/rooms/bulk-status` | Bulk status update |
| GET | `/rooms/:id/assets` | List room assets |
| POST | `/rooms/:id/assets` | Add an asset |
| GET | `/rooms/:id/supply-pars` | List supply par levels |
| POST | `/rooms/:id/supply-pars` | Add a supply par |
| GET | `/tasks?location_id=` | List tasks (filterable by status, room, assignee) |
| POST | `/tasks` | Create a task |
| PATCH | `/tasks/:id/status` | Update task status + event log |
| POST | `/tasks/:id/assign` | Assign task to a user |
| POST | `/tasks/:id/complete` | Mark task done |
| GET | `/tasks/:id/events` | Full status event history |
| GET | `/maintenance-issues?location_id=` | List maintenance issues |
| POST | `/maintenance-issues` | Report a new issue |
| PATCH | `/maintenance-issues/:id` | Update issue status/assignee |
| GET | `/dashboard/room-board-summary?location_id=` | KPI counts per status |
| GET | `/dashboard/housekeeping-board?location_id=` | Open tasks with room numbers |
| GET | `/dashboard/maintenance-board?location_id=` | Open issues with room numbers |

### Silver Sands location ID
The seed data uses `location_id = "loc-ss-001"`. This matches the console's demo mock-adapter location IDs.