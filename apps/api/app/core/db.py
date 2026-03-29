"""Lazy shim to re-export DB helpers from the workforce package.

This module avoids importing the legacy packages.workforce package at import-time to prevent
accidental model registration. Attributes are loaded lazily from the underlying implementation
in packages.workforce when first accessed.
"""
import importlib
from types import ModuleType
from typing import Any

_impl: ModuleType | None = None


def _load_impl() -> ModuleType:
    global _impl
    if _impl is None:
        _impl = importlib.import_module("packages.workforce.workforce.app.core.db")
    return _impl


def __getattr__(name: str) -> Any:
    impl = _load_impl()
    return getattr(impl, name)


def __dir__() -> list[str]:
    impl = _load_impl()
    return list(set(globals().keys()) | set(dir(impl)))
