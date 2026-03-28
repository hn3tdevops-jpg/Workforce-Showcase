# Overview

This project is a pnpm workspace monorepo (TypeScript + pnpm) for **Silver Sands Motel Workforce Operations Console** — a full internal operations product with auth, dashboard, rooms, tasks, assignments, shifts, staff management, property map, and Workforce Studio (AI design workspace).

## Module Status (all integrated)
| Module | Status |
|--------|--------|
| Dashboard | Live |
| Rooms | Live |
| Property Map | Live |
| Tasks | Live |
| Assignments | Live (local endpoint: `/api/v1/hospitable/assignments/`) |
| Shifts | Live |
| Event Timeline | Live |
| Users | Live |
| **Studio** | **Live** — Phases 1–9 complete: chat sessions, structured extraction, derived models (entities/workflows/views/concepts/relationships), validation (10 rules, dismiss), artifact generation (SUMMARY, DESIGN_DOC, SCHEMA_DRAFT, API_SPEC, ROADMAP, COPILOT_PACK — inline view, copy, download) |
| **Promotions** | **Live** — Phase 11: career ladder (3 tracks × 4 tiers, seeded), promotion criteria per tier, staff progress view, promote/assign tier dialog, recognition feed (6 event types) with give/delete |
| **Employees** | **Live** — Workforce Identity Package: 5 new DB tables (employee_profiles, user_employee_links, employee_role_assignments, employee_link_invitations, workforce_audit_events), 6 seeded employee profiles (one per staff user), full lifecycle transitions (ACTIVE/ON_LEAVE/SUSPENDED/TERMINATED/ARCHIVED/PENDING_HIRE), link lifecycle (ACTIVE/SUSPENDED/REVOKED/ENDED), scoped RBAC role assignments, audit log, access-context resolver. 4-tab UI: Profiles | User Links | Role Assignments | Audit Log. Routes: /api/v1/workforce/* (local:8080). |
| Settings | Live (owner-only) |
| Session Debug | Live |

The system aims to be an internal operations product, focusing on a clean, operational dashboard feel, responsive design for desktop and tablet, and fast, simple workflows. Key capabilities include managing users, roles, permissions, business context, location context, room views, room status, task management (assignment, status updates), and potentially inspections. The project emphasizes reusability of components and clear business and location context throughout the application.

# User Preferences

- **Design goals**:
    - dark mode first
    - clean operational dashboard feel
    - responsive for desktop and tablet
    - fast, simple workflows
    - reusable components
    - clear business and location context throughout the app
- **Technical rules**:
    - Use environment variable `VITE_API_BASE_URL`
    - Put API calls in a dedicated API client layer
    - Use typed interfaces for server responses
    - Use reusable UI components
    - Keep routing simple and clear
    - Add loading, empty, and error states
    - Prefer maintainable structure over over-engineering
- **Mock mode requirement**:
    - If some backend endpoints are not ready yet:
        - preserve the real API shapes
        - implement a mock adapter with the same response structure
        - make it easy to switch between mock and live API
- **Visual rules**:
    - dark background
    - clear elevated cards
    - readable tables
    - compact but not cramped spacing
    - obvious status color treatment
    - admin-product feel, not consumer app feel
- **Build order**:
    1. app shell and routing
    2. business and location context
    3. dashboard page
    4. users page
    5. rooms page
    6. tasks page
    7. mock/live API toggle cleanup
- **Demo data expectations**:
    - If mock mode is used, seed:
        - 1 business
        - 2 locations
        - 6 users
        - 10 to 20 rooms
        - 8 to 12 active tasks
        - mixed room statuses
        - mixed task statuses
        - 1 maintenance hold
        - 1 failed inspection if inspection support is present
- **Final expectation**:
    - The demo should support this flow:
        1. Admin views users
        2. Admin assigns a scoped role
        3. Manager views rooms for a location
        4. Manager assigns a room task
        5. Housekeeper moves task to in progress and then completed
        6. Dashboard reflects the result

# System Architecture

The project is structured as a pnpm monorepo with `artifacts/` for deployable applications and `lib/` for shared libraries. TypeScript is used throughout, with composite projects for efficient type-checking and dependency management.

## Core Technologies
- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **Package Manager**: pnpm
- **TypeScript**: 5.9
- **API Framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API Codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React, TypeScript, Vite

## Monorepo Structure
- `artifacts/api-server`: Express API server.
- `lib/api-spec`: OpenAPI spec and Orval configuration for API codegen.
- `lib/api-client-react`: Generated React Query hooks for API interaction.
- `lib/api-zod`: Generated Zod schemas from OpenAPI spec for validation.
- `lib/db`: Drizzle ORM schema and database connection for PostgreSQL.
- `scripts/`: Utility scripts for various tasks.

## Frontend Architecture (Workforce Frontend Demo)
The frontend is built with React, TypeScript, and Vite, aiming for a dark mode first, operational dashboard feel.

### UI/UX Decisions
- **Color Scheme**: Dark mode first.
- **Design Elements**: Clean elevated cards, readable tables, compact spacing, clear status color treatment.
- **Responsiveness**: Designed for desktop and tablet.
- **User Experience**: Fast, simple workflows, clear business and location context.

### Feature Specifications
- **Dashboard**: Displays room counts by status, task counts by status, selected business and location.
- **Users**: User table, scoped role assignments, job titles, role assignment modal.
- **Rooms**: Room list/grid by location, status badges, room details drawer, simple room editing.
- **Tasks**: Task list grouped by status, assign task action, update task status action, room reference, and assignee display.
- **App Shell**: Top navigation, sidebar, business selector, location selector to drive data context.

### Technical Implementation Details
- **API Client Layer**: Dedicated API client layer (`src/lib/api/`) for all API calls.
- **Mock Mode**: Support for a mock adapter (`src/lib/mock/`) with the same API shapes for development without a live backend, toggleable via `src/config/`.
- **State Management**: Context API (`src/context/`) for global state.
- **Component Reusability**: Emphasis on reusable UI components (`src/components/`).
- **Routing**: Simple and clear routing.
- **Error Handling**: Loading, empty, and error states implemented.

## Hospitable Module — Local API Server
A local Express API server (`artifacts/api-server`) manages the Hospitable module (property hierarchy, rooms, HK tasks, maintenance issues, dashboard) using a SQLite database.

### Database
- Uses SQLite (`hospitable.db` in `artifacts/api-server/`).
- Seeded with Silver Sands Motel demo data (buildings, floors, sectors, rooms, tasks, maintenance issues).

### API Endpoints
A comprehensive set of RESTful endpoints for managing properties, rooms, tasks, maintenance issues, and dashboard summaries.

# External Dependencies

## Backend
- **PostgreSQL**: Primary database for the monorepo.
- **Drizzle ORM**: Object-Relational Mapper for database interaction.
- **Express 5**: Node.js web application framework for API server.
- **FastAPI**: (Used by the live API at `https://hn3t.pythonanywhere.com`)
- **SQLite**: Used by the local Hospitable module API server.

## Frontend
- **React**: JavaScript library for building user interfaces.
- **TypeScript**: Superset of JavaScript for type-safe code.
- **Vite**: Next-generation frontend tooling for fast development.
- **React Query**: For data fetching, caching, and state management in React.

## Development Tools
- **pnpm workspaces**: For monorepo management.
- **esbuild**: For bundling JavaScript.
- **Zod**: For schema validation.
- **Orval**: For OpenAPI client code generation.

## Third-Party Services
- **PythonAnywhere**: Hosting for the live FastAPI backend (`https://hn3t.pythonanywhere.com`).