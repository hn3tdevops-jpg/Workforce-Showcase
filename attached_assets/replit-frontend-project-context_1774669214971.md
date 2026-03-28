# Workforce Frontend Integration Context for Replit
## Project-awareness brief for experimental frontend builds

## What this project is

Workforce is a modular operations platform that is being built as a **shared backend with multiple frontend experiments**.

I am using Replit to prototype alternate frontend experiences so I can explore:
- how users should interact with the API,
- how module-based interfaces should work,
- how property/operations views should feel,
- and how different frontend structures compare before I settle on a main UI direction.

This means the frontend you build in Replit should be treated as a **design/interaction layer over an existing and evolving backend**, not as a greenfield full-stack app that invents its own backend assumptions.

---

## Core reality you need to respect

### Existing backend direction
The real backend is not an isolated toy backend.
It is part of an existing project with these characteristics:

- Backend framework direction: **FastAPI**, not Flask.
- Data/model layer direction: **SQLAlchemy + Alembic** patterns already in the repo.
- Deployment target currently used: `https://hn3t.pythonanywhere.com`
- API prefix used by frontend: `/api/v1`
- Auth style: `Authorization: Bearer <token>`
- Multi-tenant structure: there is a **business** level and often a **location** level.
- Permissions are not meant to come from a single naive flat role field alone.
- RBAC is important and should remain compatible with scoped role assignments / memberships.

So when building frontend code, do **not** assume:
- a brand new backend,
- a single global role with no scope,
- a flat single-property app,
- or a backend contract invented independently of the real project.

---

## Platform direction

Workforce is intended to be broader than a single motel dashboard.
It is a modular platform for operations across service businesses.

Important modules and directions include:
- core workforce capabilities,
- employees / staffing,
- scheduling,
- time/attendance,
- communications,
- inventory/operations,
- hospitable operations / housekeeping,
- future CRM and timeline features,
- possible future restaurant / POS / KDS style modules.

The frontend should therefore be built in a way that can evolve into a **module-oriented shell**, not a rigid one-off UI.

---

## Immediate use-case being modeled

One current frontend target is an operations console for **Silver Sands Motel**.

Example initial scenario:
- Business: `biz-silver-sands`
- Locations:
  - `loc-001` = Main Building
  - `loc-002` = Pool Wing

Relevant UI areas include:
- auth/login,
- user and staff views,
- locations,
- shifts and assignments,
- swap requests,
- shift marketplace,
- rooms,
- housekeeping tasks,
- maintenance and operations boards,
- dashboard summaries.

---

## Important domain concepts

### 1. Multi-tenant context matters
The UI should be able to understand:
- current business,
- current location,
- the fact that a user may have different access at different locations,
- and that not every screen/action should be globally available.

### 2. Role display versus real permissions
A frontend may show a role label like:
- owner
- supervisor
- staff
- concierge

But that does **not** mean the UI should assume a flat permission model.
Treat role labels as potentially simplified display values. The backend may derive real permissions from memberships or scoped role assignments.

### 3. Widget/module-oriented UX is preferred
The long-term interface direction is closer to a customizable module/widget experience than a rigid fixed-page app.

So the frontend architecture should favor:
- modular panels,
- reusable cards and boards,
- swappable layouts,
- pluggable feature areas,
- and clean data adapters.

### 4. Operations and hospitable flows matter
The platform is not just generic CRUD.
It includes real operational concepts such as:
- room housekeeping statuses,
- inspections,
- maintenance holds,
- room-level supplies and assets,
- task execution,
- assignments,
- shift-aware operations.

---

## Existing/expected API surface

The frontend should assume a backend organized around `/api/v1`, with areas such as:

- `/auth/*`
- `/locations/*`
- `/users/*`
- `/roles/*`
- `/shifts/*`
- `/shifts/swaps/*`
- `/shifts/marketplace/*`
- `/hospitable/rooms/*`
- `/hospitable/tasks/*`
- `/hospitable/dashboard/*`

Do not invent totally unrelated routes if you can avoid it.
If you need a mock layer for prototyping, build it as a **replaceable adapter**, not as the app's permanent architecture.

---

## Frontend architecture guidance

Build the Replit frontend so it can work in three modes:

### Mode A: mock/demo mode
Use local mock data to prototype UX quickly.

### Mode B: API adapter mode
Use a typed API client and service layer that can target the real backend.

### Mode C: mixed/fallback mode
Allow the UI to call the real backend where available and fall back to mock data for unfinished endpoints.

This is important because the backend and frontend are both evolving.

Recommended structure:
- `lib/api/client`
- `lib/api/contracts`
- `lib/api/adapters`
- `features/auth`
- `features/locations`
- `features/shifts`
- `features/hospitable`
- `components/shell`
- `components/widgets`
- `components/boards`
- `components/property-map` (if applicable)

---

## UX directions worth exploring

Because this is an experimental frontend effort, it is useful to prototype multiple interaction patterns such as:

1. **Classic operations dashboard**
   - sidebar + header + boards + detail drawer

2. **Widget shell**
   - drag/rearrange/resizable modules
   - each module backed by a focused API adapter

3. **Property-centric interface**
   - property/building/floor/room exploration
   - visual room map
   - click a room to inspect status, supplies, issues, tasks, notes

4. **Shift and labor control center**
   - week schedule
   - staffing gaps
   - swap approvals
   - marketplace claims
   - role/location filters

5. **Mobile-friendly task execution view**
   - simple task list
   - checkoff flows
   - status updates
   - assignment visibility

---

## Specific backend-awareness rules for Replit

1. **Do not assume Flask or a separate Replit-native backend.**
   The frontend should target the existing backend direction.

2. **Do not treat `user.role` as the only permission source.**
   Use it as a display hint when helpful, but keep authorization-sensitive UI tolerant of scoped memberships.

3. **Keep API access isolated behind an adapter layer.**
   That makes it easy to switch between mock data and the real API.

4. **Avoid hardcoding one-property assumptions.**
   The platform should support multiple businesses/locations/modules over time.

5. **Do not overfit the entire app to the Silver Sands seed data.**
   Use that as a demonstration scenario only.

6. **Do not redesign the backend contract casually.**
   If you need a temporary frontend-only shape, transform it in the adapter layer.

7. **Expect incremental backend completion.**
   Some backend areas may be partially implemented. The frontend should degrade gracefully.

---

## Interface principles

The UI should feel:
- modular,
- operational,
- configurable,
- visual,
- scalable,
- and suitable for real managers and workers.

Useful patterns include:
- board views,
- cards,
- status chips,
- filters,
- drawers,
- per-location context switching,
- quick actions,
- compact forms,
- and mobile-friendly execution flows.

---

## Data and status examples

Examples of domain statuses you may encounter or prototype around:

### Shift states
- open
- partial
- filled
- draft
- cancelled
- in_progress
- completed

### Hospitality / room states
Examples may include:
- dirty
- clean
- ready for inspection
- inspection completed
- maintenance hold
- stay over
- do not disturb
- laundry service only

Treat these as configurable operational concepts rather than permanent universal constants.

---

## Good output from Replit

Helpful deliverables include:
- an experimental frontend shell,
- a typed API service layer,
- mock adapters that mirror expected backend responses,
- multiple screen variants for the same module,
- a property/room board prototype,
- a shift board prototype,
- a task execution/mobile prototype,
- and components that can later be moved into the main frontend codebase.

---

## Summary for Replit

You are not inventing a standalone app from scratch.
You are helping prototype **frontend interaction models for an existing, evolving Workforce backend**.

Build the frontend so it is:
- modular,
- API-aware,
- replaceable/adaptable,
- scoped for multi-location operations,
- and compatible with a real backend that will continue to evolve.

