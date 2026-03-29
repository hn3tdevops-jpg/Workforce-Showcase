# Allow models to be imported from the larger workforce app when available.
import os
from pkgutil import extend_path

__path__ = extend_path(__path__, __name__)

# Compute repository root (projects_active) reliably by ascending four levels from this file
_repo_root = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
_workforce_models = os.path.normpath(os.path.join(_repo_root, 'packages', 'workforce', 'workforce', 'app', 'models'))
# Append the package models as a fallback so the canonical apps.api.app.models
# modules in this directory are preferred. This prevents circular imports and
# ensures canonical modules are the source of truth for SQLAlchemy Table
# registrations.
if os.path.isdir(_workforce_models) and _workforce_models not in __path__:
    __path__.append(_workforce_models)

# Ensure that imports using the shorter 'app.models' package resolve to the same
# canonical module objects. Some modules historically import from 'app.models.*'
# and others from 'apps.api.app.models.*' which led to duplicate module objects
# and multiple DeclarativeBase instances. Alias loaded canonical submodules
# into sys.modules under the legacy package names.
try:
    import sys

    # Register the package-level alias
    sys.modules.setdefault('app.models', sys.modules[__name__])

    # For any already-imported canonical submodules, alias them to the legacy
    # 'app.models.<mod>' name so further imports refer to the same object.
    for modname, mod in list(sys.modules.items()):
        if modname.startswith('apps.api.app.models.'):
            short_name = modname.split('.')[-1]
            alias = f'app.models.{short_name}'
            if alias not in sys.modules:
                sys.modules[alias] = mod
except Exception:
    # Best-effort only; do not fail imports if aliasing can't be applied
    pass
