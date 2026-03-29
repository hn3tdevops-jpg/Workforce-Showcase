# Phase 1 — Duplicate table name scan

Date: 2026-03-29

Summary:
A scan for __tablename__ and Table(...) usages found multiple duplicate table names across packages and apps. This is causing SQLAlchemy to attempt to register the same table multiple times under different declarative bases/registries, leading to import-time errors when tests or model registration imports modules.

Conflicts found (non-exhaustive):
- businesses: defined in apps/api/app/models/tenant.py and packages/workforce/workforce/app/models/business.py and packages/hospitable/hospitable/models/tenancy.py and apps/ops/hospitable-ops/app/models/tenancy_models.py
- memberships: defined in apps/api/app/models/access_control.py, packages/hospitable/hospitable/models/tenancy.py, packages/workforce/workforce/app/models/identity.py, apps/ops/hospitable-ops/app/models/tenancy_models.py
- roles / permissions / role_permissions: present in apps/api/app/models/access_control.py, packages/workforce/*, and apps/ops/*
- user_roles / user_role_assignments / membership_roles: similar overlap
- audit_logs / audit_events: present in multiple housekeeping / audit models across packages
- widget_definitions, employees, hk_rooms and other domain tables duplicated under packages and apps

Recommendation:
1. Establish canonical model package imports (per repo decision D-0006: canonical backend import root is `app` / `apps/api/app`).
2. Avoid importing or registering models from legacy package locations during app startup. Use package `__init__` to conditionally register domain models.
3. Short-term mitigation: in model modules that declare tables via Table(...), add extend_existing=True or guard model import to avoid duplicate registration during test/import (not preferred long-term).

Files scanned:
- List of files with __tablename__ occurrences and Table(...) usages included below.

Files (selection):
- apps/api/app/models/tenant.py
- apps/api/app/models/access_control.py
- packages/workforce/workforce/app/models/business.py
- packages/workforce/workforce/app/models/identity.py
- packages/workforce/workforce/app/models/audit.py
- packages/workforce/workforce/app/models/employee.py
- packages/hospitable/hospitable/models/tenancy.py
- apps/ops/hospitable-ops/app/models/tenancy_models.py
- apps/ops/hospitable-ops/app/models/rbac_models.py

Next steps:
- Decide canonical model roots and update imports.
- Implement import guards or refactor legacy models into a non-imported package unless explicitly attached.
- Run pytest after resolving duplicate registration.

Detailed scan output saved in-session for review.
