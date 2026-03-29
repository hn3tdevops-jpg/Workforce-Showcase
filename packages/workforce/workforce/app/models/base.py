# Redirect to canonical models to avoid duplicate SQLAlchemy registrations
try:
    from apps.api.app.models.base import *  # noqa: F401,F403
    from apps.api.app.models import base as _canonical_mod  # type: ignore
    __all__ = getattr(_canonical_mod, "__all__", []) or [n for n in dir(_canonical_mod) if not n.startswith("_")]
except Exception:
    import uuid
    from datetime import datetime, timezone

    from sqlalchemy import DateTime, String, func
    from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


    def _now() -> datetime:
        return datetime.now(timezone.utc)


    class Base(DeclarativeBase):
        pass


    class TimestampMixin:
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True),
            server_default=func.now(),
            default=_now,
            nullable=False,
        )
        updated_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True),
            server_default=func.now(),
            default=_now,
            onupdate=_now,
            nullable=False,
        )


    class UUIDMixin:
        id: Mapped[str] = mapped_column(
            String(36),
            primary_key=True,
            default=lambda: str(uuid.uuid4()),
        )
