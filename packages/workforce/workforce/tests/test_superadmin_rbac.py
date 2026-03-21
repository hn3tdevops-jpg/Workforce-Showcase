import os
import pytest
from sqlalchemy import select

os.environ.setdefault("DATABASE_URL", "sqlite://")
from apps.api.app.core.db import engine, db_session
from apps.api.app.models.base import Base

# Ensure in-memory test DB has schema
Base.metadata.create_all(engine)

from fastapi import HTTPException
from apps.api.app.core.auth_deps import (
    _get_user_permissions,
    _get_user_location_permissions,
    _resolve_business_id,
    get_tenant_ctx,
)
from apps.api.app.models.identity import (
    User,
    Membership,
    BizRole,
    BizRolePermission,
    Permission,
    MembershipRole,
    MembershipLocationRole,
)
from apps.api.app.models.business import Business
from apps.api.app.services.roles_seed import seed_permissions_and_roles


def test_superadmin_bypasses_membership_and_has_all_permissions():
    with db_session() as db:
        # create a superadmin user with no memberships
        u = User(email='super@example.com', is_superadmin=True, hashed_password='')
        db.add(u)
        db.flush()

        b_id = 'biz-super-1'
        biz = Business(id=b_id, name='Super Biz')
        db.add(biz)
        db.flush()

        # superadmin should bypass membership checks
        resolved = _resolve_business_id(u, b_id, db)
        assert resolved == b_id

        # and should have wildcard permissions
        perms = _get_user_permissions(u, b_id, db)
        assert "*" in perms

        loc_perms = _get_user_location_permissions(u, b_id, 'loc-1', db)
        assert "*" in loc_perms

        # get_tenant_ctx should reflect superadmin state
        ctx = get_tenant_ctx(u, b_id, db)
        assert ctx.is_superadmin is True
        assert "*" in ctx.permissions


def test_non_superadmin_without_membership_is_denied():
    with db_session() as db:
        u = User(email='no_member@example.com', is_superadmin=False, hashed_password='')
        db.add(u)
        db.flush()

        b_id = 'biz-deny-1'
        biz = Business(id=b_id, name='Deny Biz')
        db.add(biz)
        db.flush()

        with pytest.raises(HTTPException) as exc:
            _resolve_business_id(u, b_id, db)
        assert exc.value.status_code == 403


def test_location_scoped_permissions_are_enforced():
    with db_session() as db:
        # regular user with membership
        u = User(email='permuser@example.com', is_superadmin=False, hashed_password='')
        db.add(u)
        db.flush()

        b_id = 'biz-loc-1'
        biz = Business(id=b_id, name='Loc Biz')
        db.add(biz)
        db.flush()

        m = Membership(user_id=u.id, business_id=b_id, status='active')
        db.add(m)
        db.flush()

        # create a role and a global business-level permission
        p_biz = Permission(key='members:read')
        db.add(p_biz)
        db.flush()
        r_biz = BizRole(id='role-biz-1', name='RoleBiz')
        db.add(r_biz)
        db.flush()
        db.add(BizRolePermission(role_id=r_biz.id, permission_id=p_biz.id))
        db.flush()

        # assign the membership role (business-wide)
        db.add(MembershipRole(membership_id=m.id, role_id=r_biz.id))
        db.flush()

        perms = _get_user_permissions(u, b_id, db)
        assert 'members:read' in perms

        # create a location-scoped permission + role
        p_loc = Permission(key='hk.tasks.manage')
        db.add(p_loc)
        db.flush()
        r_loc = BizRole(id='role-loc-1', name='RoleLoc')
        db.add(r_loc)
        db.flush()
        db.add(BizRolePermission(role_id=r_loc.id, permission_id=p_loc.id))
        db.flush()

        # assign a location-specific role for location A only
        db.add(MembershipLocationRole(membership_id=m.id, location_id='loc-A', role_id=r_loc.id))
        db.flush()

        # location A should have the permission
        loc_perms_a = _get_user_location_permissions(u, b_id, 'loc-A', db)
        assert 'hk.tasks.manage' in loc_perms_a

        # location B should NOT have the permission
        loc_perms_b = _get_user_location_permissions(u, b_id, 'loc-B', db)
        assert 'hk.tasks.manage' not in loc_perms_b


def test_seed_permissions_idempotent():
    with db_session() as db:
        # Run seed twice and ensure counts are stable and no duplicates
        res1 = seed_permissions_and_roles(db)
        res2 = seed_permissions_and_roles(db)

        assert res1['permissions_total'] == res2['permissions_total']
        assert res1['roles_total'] == res2['roles_total']

        # ensure no duplicate permission keys exist
        keys = db.execute(select(Permission.key)).scalars().all()
        assert len(keys) == len(set(keys))
