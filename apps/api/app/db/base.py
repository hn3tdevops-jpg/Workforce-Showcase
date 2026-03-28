"""Model import helpers to ensure SQLAlchemy metadata is populated.

This file consolidates several earlier approaches and retains robust fallbacks.
"""

import importlib
import sys
import traceback
from apps.api.app.models.base import Base


def import_core_models() -> None:
    try:
        import apps.api.app.models.tenant  # noqa: F401
        import apps.api.app.models.user  # noqa: F401
    except Exception:
        import app.models.tenant  # noqa: F401
        import app.models.user  # noqa: F401


def import_domain_models() -> None:
    try:
        import apps.api.app.modules.hospitable.models.property_ops  # noqa: F401
    except Exception:
        import app.modules.hospitable.models.property_ops  # noqa: F401


def import_models() -> None:
    """Import all models so Alembic metadata is populated.

    Attempt to import the consolidated models package and iterate its modules.
    If that fails, fall back to importing named core and domain model helpers.
    """
    try:
        pkg = importlib.import_module("apps.api.app.models")
        for p in pkg.__path__:
            try:
                for fn in sorted(__import__("os").listdir(p)):
                    if not fn.endswith(".py") or fn.startswith("__"):
                        continue
                    mod_name = fn[:-3]
                    try:
                        importlib.import_module(f"apps.api.app.models.{mod_name}")
                    except Exception:
                        traceback.print_exc(file=sys.stderr)
                        continue
            except FileNotFoundError:
                continue
    except Exception:
        import_core_models()
        import_domain_models()
