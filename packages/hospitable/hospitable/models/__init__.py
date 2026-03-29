# Guard legacy package model import to avoid duplicate SQLAlchemy registrations
import os

# Prefer canonical hospitable models from the apps.api.app package when available
try:
    from apps.api.app.modules.hospitable import models as canonical_models  # type: ignore
    from apps.api.app.modules.hospitable.models import *  # noqa: F401,F403
    __all__ = getattr(canonical_models, "__all__", []) or [name for name in dir(canonical_models) if not name.startswith("_")]

    # Alias canonical submodules into the package's module namespace to avoid double-importing
    try:
        import sys, importlib
        canonical_dir = os.path.dirname(canonical_models.__file__)
        for fname in os.listdir(canonical_dir):
            if not fname.endswith('.py') or fname.startswith('__'):
                continue
            mod_name = fname[:-3]
            full_can = f"apps.api.app.modules.hospitable.models.{mod_name}"
            try:
                m = importlib.import_module(full_can)
                sys.modules[f"packages.hospitable.hospitable.models.{mod_name}"] = m
            except Exception:
                pass
    except Exception:
        pass

except Exception:
    if os.environ.get("WORKFORCE_EXPOSE_PACKAGE_MODELS", "0") == "1":
        from .tenancy import Base, Business, Location, Membership

        __all__ = ["Base", "Business", "Location", "Membership"]
    else:
        __all__ = []
