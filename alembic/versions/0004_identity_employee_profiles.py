"""Restore missing migration 0004_identity_employee_profiles (placeholder)

This placeholder restores the missing Alembic revision so alembic can resolve the migration
history. It intentionally performs no schema changes — the goal is to unblock alembic so that
existing migrations (0001-0003) can be applied cleanly. If domain-specific schema is required,
create a follow-up migration to add missing tables.

Revision ID: 0004_identity_employee_profiles
Revises: 0003_platform_access_control
Create Date: 2026-03-29
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_identity_employee_profiles"
down_revision = "0003_platform_access_control"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Placeholder migration: no schema changes. This file restores the missing revision
    # so Alembic can operate. Implement the real migration if required.
    pass


def downgrade() -> None:
    # No-op downgrade
    pass
