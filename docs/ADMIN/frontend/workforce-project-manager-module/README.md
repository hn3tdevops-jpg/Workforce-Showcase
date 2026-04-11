# Workforce Project Manager Module

Drop-in frontend scaffold for a Workforce-wide project operations surface.

## What is included

- Project manager dashboard UI
- Docs, tasks, progress, and source ingestion views
- Markdown parsing helpers for headings, todos, blockers, and dates
- Local storage workspace persistence
- API adapter boundary for later backend wiring
- Route stub for a superadmin mount point
- Config object for registration and endpoint wiring

## Suggested destination

Copy the `src/modules/project-manager` folder into your frontend app and wire the route file into your route registry.

## Recommended route

`/superadmin/project-manager`

## Recommended access policy

`superadmin_only`

## Next integration steps

1. Move the module files into `workforce_frontend_app`.
2. Register the route in your frontend router.
3. Replace local-storage-only flows with live API calls from `adapters.ts`.
4. Point the config endpoints at your backend.
5. Add RBAC gating at the route or layout level.

## Proposed backend endpoints

- `GET /api/v1/project-manager/docs`
- `GET /api/v1/project-manager/tasks`
- `GET /api/v1/project-manager/sources`
- `GET /api/v1/project-manager/progress`
- `POST /api/v1/project-manager/ai/brief`

## Notes

This scaffold intentionally keeps the presentational dashboard mostly separate from the data access layer so you can evolve the backend without rewriting the UI.
