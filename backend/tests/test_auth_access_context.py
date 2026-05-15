"""
Regression tests for GET /api/v1/auth/me/access-context — Python FastAPI backend.

These are actual route/API behaviour tests executed via FastAPI's TestClient
(ASGI transport; no network calls needed).

Coverage:
  - unauthenticated request → 401
  - active membership + permissions → has_access true, effective_permissions present
  - active membership + no permissions → has_access true, empty effective_permissions
  - no memberships + permissions → has_access false, active_scope_count 0
  - inactive membership + permissions → has_access false
  - legacy membership (no status field) → has_access true
  - is_super_admin: "*" permission → true
  - is_super_admin: "superadmin:*" permission → true
  - is_super_admin: "superadmin:<verb>" prefix → true
  - is_super_admin: regular permissions only → false
  - response shape includes all required AccessContextResponse fields
"""
import pytest
import jwt as pyjwt
from fastapi.testclient import TestClient

from backend.main import app

SECRET_KEY = "dev-secret-key-change-in-production"
ALGORITHM = "HS256"
ENDPOINT = "/api/v1/auth/me/access-context"

client = TestClient(app)


# ── Helpers ───────────────────────────────────────────────────────────────────


def make_token(**claims) -> str:
    """Encode a JWT with ``sub`` defaulting to ``"user-001"``."""
    payload = {"sub": "user-001", **claims}
    return pyjwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ── Unauthenticated ───────────────────────────────────────────────────────────


class TestUnauthenticated:
    def test_no_token_returns_401(self):
        resp = client.get(ENDPOINT)
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Not authenticated"

    def test_invalid_token_returns_401(self):
        resp = client.get(ENDPOINT, headers={"Authorization": "Bearer not-a-jwt"})
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Not authenticated"


# ── Active membership + permissions ──────────────────────────────────────────


class TestActiveMembershipWithPermissions:
    def test_returns_200_has_access_true(self):
        token = make_token(
            permissions=["rooms:write", "tasks:write"],
            roles=["Supervisor"],
            memberships=[{"business_id": "biz-001", "status": "active"}],
            first_name="Marcus",
            last_name="Yee",
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["has_access"] is True
        assert data["active_scope_count"] == 1

    def test_effective_permissions_present(self):
        token = make_token(
            permissions=["rooms:write", "tasks:write"],
            roles=["Supervisor"],
            memberships=[{"business_id": "biz-001", "status": "active"}],
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        scope = resp.json()["scopes"][0]
        assert scope["effective_permissions"] == ["rooms:write", "tasks:write"]

    def test_employee_name_derived_from_first_last(self):
        token = make_token(
            permissions=["rooms:write"],
            memberships=[{"business_id": "biz-001", "status": "active"}],
            first_name="Marcus",
            last_name="Yee",
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        assert resp.json()["scopes"][0]["employee_name"] == "Marcus Yee"

    def test_response_contains_required_shape_fields(self):
        token = make_token(
            permissions=["rooms:write"],
            roles=["Staff"],
            memberships=[{"business_id": "biz-001", "status": "active"}],
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        data = resp.json()
        assert "user_id" in data
        assert "has_access" in data
        assert "active_scope_count" in data
        assert "scopes" in data
        assert "resolved_at" in data
        scope = data["scopes"][0]
        assert "employee_profile_id" in scope
        assert "employee_name" in scope
        assert "employment_status" in scope
        assert "assignments" in scope
        assert "effective_permissions" in scope
        assert "is_super_admin" in scope


# ── Active membership + no permissions ───────────────────────────────────────


class TestActiveMembershipNoPermissions:
    def test_has_access_true_with_empty_effective_permissions(self):
        """Active membership is sufficient for has_access; permissions may be empty."""
        token = make_token(
            permissions=[],
            roles=[],
            memberships=[{"business_id": "biz-001", "status": "active"}],
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["has_access"] is True
        assert data["scopes"][0]["effective_permissions"] == []


# ── No memberships ────────────────────────────────────────────────────────────


class TestNoMemberships:
    def test_permissions_alone_do_not_grant_access(self):
        """A user with permissions but no memberships must receive has_access: false."""
        token = make_token(
            permissions=["rooms:write", "tasks:write"],
            roles=["Staff"],
            memberships=[],
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["has_access"] is False
        assert data["active_scope_count"] == 0
        assert data["scopes"] == []

    def test_no_memberships_no_permissions_returns_has_access_false(self):
        token = make_token(permissions=[], roles=[], memberships=[])
        resp = client.get(ENDPOINT, headers=auth_header(token))
        data = resp.json()
        assert data["has_access"] is False
        assert data["active_scope_count"] == 0


# ── Inactive membership ───────────────────────────────────────────────────────


class TestInactiveMembership:
    def test_inactive_membership_with_permissions_returns_has_access_false(self):
        token = make_token(
            permissions=["rooms:write", "tasks:write"],
            roles=["Staff"],
            memberships=[{"business_id": "biz-001", "status": "inactive"}],
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        data = resp.json()
        assert data["has_access"] is False
        assert data["active_scope_count"] == 0

    def test_suspended_membership_returns_has_access_false(self):
        token = make_token(
            permissions=["rooms:write"],
            memberships=[{"business_id": "biz-001", "status": "suspended"}],
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        data = resp.json()
        assert data["has_access"] is False


# ── Legacy membership (no status field) ──────────────────────────────────────


class TestLegacyMembership:
    def test_membership_without_status_treated_as_active(self):
        """Legacy records with no status field are implicitly active."""
        token = make_token(
            permissions=["rooms:read"],
            memberships=[{"business_id": "biz-001"}],
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        data = resp.json()
        assert data["has_access"] is True


# ── is_super_admin detection ──────────────────────────────────────────────────


class TestSuperAdmin:
    def test_wildcard_permission_is_super_admin(self):
        token = make_token(
            permissions=["*"],
            memberships=[{"business_id": "biz-001", "status": "active"}],
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        assert resp.json()["scopes"][0]["is_super_admin"] is True

    def test_superadmin_star_is_super_admin(self):
        token = make_token(
            permissions=["superadmin:*"],
            memberships=[{"business_id": "biz-001", "status": "active"}],
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        assert resp.json()["scopes"][0]["is_super_admin"] is True

    def test_superadmin_prefix_is_super_admin(self):
        token = make_token(
            permissions=["superadmin:read", "superadmin:write"],
            memberships=[{"business_id": "biz-001", "status": "active"}],
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        assert resp.json()["scopes"][0]["is_super_admin"] is True

    def test_regular_permissions_only_is_not_super_admin(self):
        token = make_token(
            permissions=["rooms:write", "tasks:write"],
            memberships=[{"business_id": "biz-001", "status": "active"}],
        )
        resp = client.get(ENDPOINT, headers=auth_header(token))
        assert resp.json()["scopes"][0]["is_super_admin"] is False
