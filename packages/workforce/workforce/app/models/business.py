# Redirect to canonical models to avoid duplicate SQLAlchemy registrations
try:
    from apps.api.app.models.business import *  # noqa: F401,F403
    from apps.api.app.models import business as _canonical_mod  # type: ignore
    __all__ = getattr(_canonical_mod, "__all__", []) or [n for n in dir(_canonical_mod) if not n.startswith("_")]
except Exception:
    from sqlalchemy import DateTime, ForeignKey, String, Text
    from sqlalchemy.orm import Mapped, mapped_column, relationship

    from packages.workforce.workforce.app.models.base import Base, TimestampMixin, UUIDMixin


    class Business(UUIDMixin, TimestampMixin, Base):
        __tablename__ = "businesses"

        name: Mapped[str] = mapped_column(String(255), nullable=False)
        plan: Mapped[str] = mapped_column(String(50), nullable=False, default="free")
        settings_json: Mapped[str | None] = mapped_column(Text, nullable=True)
        deleted_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)

        locations: Mapped[list["Location"]] = relationship("Location", back_populates="business")


    class Location(UUIDMixin, TimestampMixin, Base):
        __tablename__ = "locations"

        business_id: Mapped[str] = mapped_column(
            String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
        )
        parent_id: Mapped[str | None] = mapped_column(
            String(36), ForeignKey("locations.id", ondelete="CASCADE"), nullable=True, index=True
        )
        name: Mapped[str] = mapped_column(String(255), nullable=False)
        timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
        settings_json: Mapped[str | None] = mapped_column(Text, nullable=True)

        business: Mapped["Business"] = relationship("Business", back_populates="locations")
        parent: Mapped["Location | None"] = relationship(
            "Location", back_populates="children", remote_side="Location.id"
        )
        children: Mapped[list["Location"]] = relationship(
            "Location", back_populates="parent", cascade="all, delete-orphan"
        )
