# Phase 1 — Patch actions applied

Date: 2026-03-29

Changes applied:
- Guarded legacy package model imports behind env flags:
  - packages/workforce/workforce/app/models/__init__.py (now only exposes models when WORKFORCE_EXPOSE_PACKAGE_MODELS=1)
  - packages/hospitable/hospitable/models/__init__.py (now only exposes models when WORKFORCE_EXPOSE_PACKAGE_MODELS=1)
  - apps/ops/hospitable-ops/app/models/__init__.py (now only exposes ops models when WORKFORCE_EXPOSE_OPS_MODELS=1)
- Made apps/api/app/core/db.py a lazy shim to avoid importing packages.workforce at import-time
- Committed changes.

Test results summary:
- Running pytest after the patches still produces failures. Primary cause: missing alembic revision '0004_identity_employee_profiles' prevents alembic upgrade head; tests also fail due to missing tenants table when running against a fresh DB.

Next recommended steps:
1. Locate or restore the missing alembic revision '0004_identity_employee_profiles' and ensure alembic history is complete.
2. Re-run alembic upgrade head to apply migrations to dev DB before running tests.
3. If migration cannot be restored, consider creating a safe migration that creates required tables (tenants, businesses, memberships) as minimal stopgap.

Files changed:
- packages/workforce/workforce/app/models/__init__.py
- packages/hospitable/hospitable/models/__init__.py
- apps/ops/hospitable-ops/app/models/__init__.py
- apps/api/app/core/db.py

Remaining todos:
- Fix missing migration 0004 (see repo history and branches) — new todo created in session tracker.
