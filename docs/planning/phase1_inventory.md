# Phase 1 Inventory — Models & Migrations

Date: 2026-03-29

Summary of findings from codebase scan:

- Alembic migrations: alembic/versions/0001_initial.py, 0002_hospitable_property_ops.py, 0003_platform_access_control.py (adds tenants, memberships, roles, permissions, scoped_role_assignments and backfill logic).
- Platform tenancy models (canonical): apps/api/app/models/tenant.py defines Tenant, Business (with tenant_id), and Location.
- Access control models: apps/api/app/models/access_control.py defines Membership, Role, Permission, RolePermission, ScopedRoleAssignment.
- Legacy/alternate model versions exist under packages/hospitable and apps/ops — review before migration changes.
- Tests reference tenant_id in business-related fixtures (tests/*).

Notes / next concerns:
- Migration 0003 already implements tenant/business linkage and seeds a permission catalog; verify migrations applied status in dev DB before altering.
- Some legacy models use different declarative bases/packages; ensure canonical imports use `app` package per decisions.

Files of interest (not exhaustive):
- apps/api/app/models/tenant.py
- apps/api/app/models/access_control.py
- alembic/versions/0003_platform_access_control.py
- packages/hospitable/hospitable/models/tenancy.py
- apps/ops/hospitable-ops/app/models/tenancy_models.py

Recommendation: run migration status and a test suite smoke-check next.
