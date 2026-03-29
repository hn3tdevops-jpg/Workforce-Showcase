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
