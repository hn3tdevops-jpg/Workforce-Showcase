# Guard imports to avoid registering ops package models during canonical app startup
import os

if os.environ.get("WORKFORCE_EXPOSE_OPS_MODELS", "0") == "1":
    from . import rbac
    from .rbac_models import *  # noqa: F401,F403
    from .tenancy_models import *  # noqa: F401,F403
else:
    # no-op to keep legacy ops models from polluting global metadata
    pass
