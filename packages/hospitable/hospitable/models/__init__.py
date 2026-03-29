# Guard legacy package model import to avoid duplicate SQLAlchemy registrations
import os

if os.environ.get("WORKFORCE_EXPOSE_PACKAGE_MODELS", "0") == "1":
    from .tenancy import Base, Business, Location, Membership

    __all__ = ["Base", "Business", "Location", "Membership"]
else:
    __all__ = []
