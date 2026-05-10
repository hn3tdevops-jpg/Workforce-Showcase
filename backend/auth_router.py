"""
FastAPI auth router — GET /me/access-context

Implements the employment access-context contract required by the frontend
AuthProvider.  Uses the authenticated system User (resolved from JWT claims),
their active business membership, roles, and RBAC permissions already encoded
in the token.

Design constraints:
- System User records are NOT conflated with Employee profile files.
- RBAC is not bypassed: effective_permissions reflects only what the token
  already grants.
- A COMPAT scope is synthesised only when the user has at least one active
  membership (or a legacy membership with no status field).  Users who carry
  permissions but have no active membership receive has_access: false.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

import jwt as pyjwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

_raw_secret: str | None = os.getenv("JWT_SECRET_KEY")
if not _raw_secret:
    import warnings

    warnings.warn(
        "JWT_SECRET_KEY is not set. Using the insecure development default. "
        "Set JWT_SECRET_KEY in your environment before deploying to production.",
        stacklevel=1,
    )
    _raw_secret = "dev-secret-key-change-in-production"

SECRET_KEY: str = _raw_secret
# HS256 is the only algorithm issued by this backend. Accepting multiple
# algorithms can enable algorithm-confusion attacks, so a single value is used.
_ALGORITHM = "HS256"

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)


# ── Response models ───────────────────────────────────────────────────────────


class AssignmentScope(BaseModel):
    id: str
    role_name: str
    scope_type: str
    permissions: list[str]


class EmploymentScope(BaseModel):
    employee_profile_id: str
    employee_name: str
    employee_code: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    employment_status: str
    assignments: list[AssignmentScope]
    effective_permissions: list[str]
    is_super_admin: bool


class AccessContextResponse(BaseModel):
    user_id: str
    has_access: bool
    active_scope_count: int
    scopes: list[EmploymentScope]
    resolved_at: str


# ── Helpers ───────────────────────────────────────────────────────────────────


def _is_super_admin(permissions: list[str]) -> bool:
    """Return True when the permission set implies super-admin access."""
    return "*" in permissions or any(
        p == "superadmin:*" or p.startswith("superadmin:") for p in permissions
    )


def _has_active_membership(memberships: list[dict]) -> bool:
    """Return True when the user has at least one active membership.

    Legacy records that carry no ``status`` field are treated as implicitly
    active (older backends did not track membership status).
    """
    return any(not m.get("status") or m.get("status") == "active" for m in memberships)


# ── Dependency ────────────────────────────────────────────────────────────────


def get_current_user_claims(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return pyjwt.decode(credentials.credentials, SECRET_KEY, algorithms=[_ALGORITHM])
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Not authenticated")


# ── Route ─────────────────────────────────────────────────────────────────────


@router.get("/me/access-context", response_model=AccessContextResponse)
def get_access_context(
    claims: dict = Depends(get_current_user_claims),
) -> AccessContextResponse:
    """Return the employment access context for the authenticated user.

    Resolves using system User identity and active business membership from JWT
    claims.  Does not look up Employee profile records — system Users and
    Employee files are kept separate.  RBAC permissions are taken from the
    existing claims already granted to the token; none are elevated here.

    Returns a COMPAT scope when:
    - No real employee-profile link records are present (compatibility mode).
    - The user has at least one active membership.

    Returns has_access: false when:
    - The user has no active membership (even if permissions are present).
    - The user is unauthenticated → 401.
    """
    user_id: Optional[str] = (
        claims.get("sub") or claims.get("id") or claims.get("user_id")
    )
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    permissions: list[str] = claims.get("permissions", [])
    roles: list[str] = claims.get("roles", [])
    memberships: list[dict] = claims.get("memberships", [])
    first_name: str = claims.get("first_name", "")
    last_name: str = claims.get("last_name", "")
    email: str = claims.get("email", str(user_id))
    job_title: Optional[str] = claims.get("job_title")
    active_business_id: Optional[str] = claims.get("active_business_id") or claims.get(
        "business_id"
    )

    if not _has_active_membership(memberships):
        return AccessContextResponse(
            user_id=str(user_id),
            has_access=False,
            active_scope_count=0,
            scopes=[],
            resolved_at=datetime.now(timezone.utc).isoformat(),
        )

    active_membership: Optional[dict] = next(
        (m for m in memberships if not m.get("status") or m.get("status") == "active"),
        memberships[0] if memberships else None,
    )

    business_id: str = (
        active_business_id
        or (active_membership.get("business_id") if active_membership else None)
        or "biz-silver-sands"
    )

    assignments = [
        AssignmentScope(
            id=f"compat-role-{i}",
            role_name=role,
            scope_type="BUSINESS",
            permissions=permissions,
        )
        for i, role in enumerate(roles)
    ]

    employee_name = f"{first_name} {last_name}".strip() or email

    scope = EmploymentScope(
        employee_profile_id=f"compat-ep-{user_id}",
        employee_name=employee_name,
        job_title=job_title,
        employment_status="ACTIVE",
        assignments=assignments,
        effective_permissions=permissions,
        is_super_admin=_is_super_admin(permissions),
    )

    return AccessContextResponse(
        user_id=str(user_id),
        has_access=True,
        active_scope_count=1,
        scopes=[scope],
        resolved_at=datetime.now(timezone.utc).isoformat(),
    )
