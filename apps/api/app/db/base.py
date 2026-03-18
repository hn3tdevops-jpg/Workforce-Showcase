from app.models.base import Base


def import_core_models() -> None:
    import app.models.tenant  # noqa: F401
    import app.models.user  # noqa: F401
    import app.models.access_control  # noqa: F401


def import_domain_models() -> None:
    import app.modules.hospitable.models.property_ops  # noqa: F401


def import_models() -> None:
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    """Import all models so metadata is populated."""
    import apps.api.app.models.tenant  # noqa: F401
    import apps.api.app.models.user  # noqa: F401
    import apps.api.app.modules.hospitable.models.property_ops  # noqa: F401
=======
    """Import all models so Alembic metadata is populated.

    Prefer the full workforce models package when available — it imports every
    model module so SQLAlchemy metadata is complete.
    """
    # Import the consolidated models package (this will import every model module)
    import importlib

    try:
        pkg = importlib.import_module("apps.api.app.models")
        # Import every .py module inside the models package so SQLAlchemy metadata is populated.
        for p in pkg.__path__:
            try:
                for fn in sorted(os.listdir(p)):
                    if not fn.endswith(".py") or fn.startswith("__"):
                        continue
                    mod_name = fn[:-3]
                    try:
                        importlib.import_module(f"apps.api.app.models.{mod_name}")
                    except Exception:
                        # Import problems in one model should not prevent loading others.
                        # Log to stderr for debugging but continue.
                        import sys, traceback

                        traceback.print_exc(file=sys.stderr)
                        continue
            except FileNotFoundError:
                continue
    except Exception:
        # Fallback: import a small set of local models if the full package isn't present
        import apps.api.app.models.tenant  # noqa: F401
        import apps.api.app.models.user  # noqa: F401
        import apps.api.app.modules.hospitable.models.property_ops  # noqa: F401
>>>>>>> 0868e6b (Add runtime and WSGI entrypoints for workforce deployment)
=======
    """Import all currently active models."""
=======
>>>>>>> 1430462 (Stabilize canonical backend metadata and v1 API surface)
    import_core_models()
    import_domain_models()
>>>>>>> d8433ac (Normalize model registration and async config defaults)
