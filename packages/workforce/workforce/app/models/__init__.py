"""Model registry guarded to avoid registering legacy package models during canonical app startup.

This file redirects imports to the canonical apps.api.app.models package when available to
prevent duplicate SQLAlchemy Table registrations. If the environment variable
WORKFORCE_EXPOSE_PACKAGE_MODELS is set to "1", it will import local package models instead.
"""
import os

# Prefer canonical app models to avoid duplicate SQLAlchemy registrations
try:
    from apps.api.app import models as canonical_models  # type: ignore
    # Re-export everything from canonical models
    from apps.api.app.models import *  # noqa: F401,F403
    __all__ = getattr(canonical_models, "__all__", []) or [name for name in dir(canonical_models) if not name.startswith("_")]

    # Alias canonical submodules into the package's module namespace to avoid double-importing
    try:
        import sys, importlib
        canonical_dir = os.path.dirname(canonical_models.__file__)
        for fname in os.listdir(canonical_dir):
            if not fname.endswith('.py') or fname.startswith('__'):
                continue
            mod_name = fname[:-3]
            full_can = f"apps.api.app.models.{mod_name}"
            try:
                m = importlib.import_module(full_can)
                sys.modules[f"packages.workforce.workforce.app.models.{mod_name}"] = m
            except Exception:
                # ignore individual module alias failures
                pass
    except Exception:
        pass

except Exception:
    if os.environ.get("WORKFORCE_EXPOSE_PACKAGE_MODELS", "0") == "1":
        # Local model registry: import all model classes so Base.metadata is populated
        from packages.workforce.workforce.app.models.base import Base  # noqa: F401
        from packages.workforce.workforce.app.models.business import Business, Location  # noqa: F401
        from packages.workforce.workforce.app.models.employee import Employee, Employment, EmployeeRole, Role  # noqa: F401
        from packages.workforce.workforce.app.models.scheduling import AvailabilityBlock, Shift, ShiftAssignment  # noqa: F401
        from packages.workforce.workforce.app.models.training import EmployeeTraining, TrainingModule  # noqa: F401
        from packages.workforce.workforce.app.models.audit import AuditLog  # noqa: F401
        from packages.workforce.workforce.app.models.identity import AuditEvent  # noqa: F401
        from packages.workforce.workforce.app.models.identity import (
            User, RefreshToken, Membership, WorkerProfile,
            BizRole, Permission, BizRolePermission, MembershipRole, MembershipLocationRole,
            Agent, AgentCredential, AgentRun,
        )  # noqa: F401
        from packages.workforce.workforce.app.models.auth import Role as AuthRole, user_roles  # noqa: F401
        from packages.workforce.workforce.app.models.timeclock import TimeEntry, TimeEntryStatus  # noqa: F401
        from packages.workforce.workforce.app.models.marketplace import (
            JobPosting, ShiftRequest, TrainingRequest, ShiftSwapRequest, SwapPermissionRule,
            PostingStatus, RequestStatus, SwapStatus, SwapRuleEffect,
        )  # noqa: F401
        from packages.workforce.workforce.app.models.schedule import ScheduleShift, ScheduleAssignment, ShiftStatus, AssignmentStatus  # noqa: F401
        from packages.workforce.workforce.app.models.dashboard import WidgetDefinition, DashboardTemplate, UserDashboard, WidgetType  # noqa: F401
        from packages.workforce.workforce.app.models.messaging import Channel, ChannelMember, Message, MessagingApiKey  # noqa: F401
        from packages.workforce.workforce.app.models.hkops import (
            HKRoom, HKTaskType, HKTask, HKInspection,
            RoomStatus, TaskStatus, TaskPriority, InspectionResult,
        )  # noqa: F401
    else:
        # No-op registry to avoid populating Base.metadata
        __all__ = []
