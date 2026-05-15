/**
 * Tests for GET /api/v1/auth/me/access-context
 *
 * Actual route/API behaviour tests live in:
 *   backend/tests/test_auth_access_context.py  (pytest + FastAPI TestClient)
 *
 * These Playwright tests:
 *   a) Verify source-code invariants in the Node proxy handler — quick
 *      sanity check that required code paths are present after edits.
 *   b) Exercise the pure compatibility-scope construction logic in-process
 *      to cover all behavioural cases the proxy must satisfy, without
 *      requiring native SQLite bindings.
 *
 * Behavioural intent validated below:
 *   - active membership + permissions → has_access true, effective_permissions present
 *   - active membership + no permissions → has_access true, empty effective_permissions
 *   - no memberships + permissions → has_access false  (permissions do NOT confer membership)
 *   - inactive membership + permissions → has_access false
 *   - legacy membership (no status) + permissions → has_access true
 *   - unauthenticated request → 401  (source-code assertion)
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";

// ── Static source-code checks ────────────────────────────────────────────────

test("auth router source: compatibility fallback is present", () => {
  const src = fs.readFileSync(
    "artifacts/api-server/src/auth/router.ts",
    "utf8"
  );

  expect(src).toContain("Compatibility fallback");
  expect(src).toContain("hasActiveMembership");
  expect(src).toContain("compat-ep-");
  expect(src).toContain("effective_permissions");
  expect(src).toContain('link_status:         "COMPAT"');
});

test("auth router source: unauthenticated path returns 401", () => {
  const src = fs.readFileSync(
    "artifacts/api-server/src/auth/router.ts",
    "utf8"
  );
  expect(src).toContain('status(401)');
  expect(src).toContain('"Not authenticated"');
});

test("auth router source: is_super_admin checks wildcard and superadmin prefix", () => {
  const src = fs.readFileSync(
    "artifacts/api-server/src/auth/router.ts",
    "utf8"
  );
  // Both the base wildcard check and the expanded superadmin prefix check must be present
  expect(src).toContain('permissions.includes("*")');
  expect(src).toContain('"superadmin:*"');
  expect(src).toContain('p.startsWith("superadmin:")');
});

test("auth router source: hasActiveMembership does NOT use permissions.length", () => {
  const src = fs.readFileSync(
    "artifacts/api-server/src/auth/router.ts",
    "utf8"
  );
  // The gate must be membership-only; permissions alone must not confer active scope
  expect(src).not.toContain("permissions.length > 0 ||");
  expect(src).toContain("if (hasActiveMembership)");
  expect(src).toContain("has_access: scopes.length > 0");
});

// ── Pure-logic tests (no DB / no server required) ────────────────────────────

/**
 * Mirrors the compat-scope builder in artifacts/api-server/src/auth/router.ts.
 *
 * **Keep in sync with the router implementation.**  If the gate logic or
 * scope shape changes in router.ts, update this function to match so the
 * behavioural assertions below remain accurate.  (TypeScript and Python share
 * no runtime; the Python backend has its own equivalent in backend/auth_router.py.)
 */
function buildCompatScope(userId: string, userData: Record<string, unknown>) {
  const permissions = (userData.permissions ?? []) as string[];
  const memberships = (userData.memberships ?? []) as Array<Record<string, unknown>>;
  const nested = userData.user as Record<string, unknown> | undefined;

  // Membership-only gate: permissions alone do not constitute active membership.
  const hasActiveMembership =
    memberships.some((m) => !m.status || m.status === "active");

  if (!hasActiveMembership) return null;

  const activeMembership =
    memberships.find((m) => !m.status || m.status === "active") ??
    memberships[0] ??
    null;

  const roleNames = (userData.roles ?? []) as string[];
  const compatAssignments = roleNames.map((r: string, i: number) => ({
    id: `compat-role-${i}`,
    role_name: r,
    scope_type: "BUSINESS",
    location_id: null,
    location_name: null,
    permissions,
  }));

  const firstName = (nested?.first_name ?? userData.first_name ?? "") as string;
  const lastName  = (nested?.last_name  ?? userData.last_name  ?? "") as string;
  const email     = (nested?.email      ?? userData.email      ?? userId) as string;
  const jobTitle  = (nested?.job_title  ?? userData.job_title  ?? null) as string | null;

  return {
    employee_profile_id: `compat-ep-${userId}`,
    link_id:             `compat-link-${userId}`,
    link_status:         "COMPAT",
    business_id:
      (userData.active_business_id ??
       userData.business_id ??
       activeMembership?.business_id ??
       "biz-silver-sands") as string,
    employee_name:       `${firstName} ${lastName}`.trim() || email,
    job_title:           jobTitle,
    department:          null,
    employee_code:       null,
    employment_status:   "ACTIVE",
    assignments:         compatAssignments,
    effective_permissions: permissions,
    is_super_admin:      permissions.includes("*") ||
      permissions.some((p) => p === "superadmin:*" || p.startsWith("superadmin:")),
  };
}

// active membership + permissions → has_access true
test("compat scope: active membership + permissions → scope returned", () => {
  const userId = "user-001";
  const userData = {
    id: userId,
    email: "manager@silversands.com",
    first_name: "Sarah",
    last_name: "Okonkwo",
    roles: ["Owner"],
    permissions: ["*"],
    active_business_id: "biz-silver-sands",
    memberships: [
      { business_id: "biz-silver-sands", role: "owner", status: "active" },
    ],
  };

  const scope = buildCompatScope(userId, userData);
  expect(scope).not.toBeNull();
  expect(scope!.effective_permissions).toContain("*");
  expect(scope!.is_super_admin).toBe(true);
  expect(scope!.employment_status).toBe("ACTIVE");
  expect(scope!.employee_name).toBe("Sarah Okonkwo");
  expect(scope!.link_status).toBe("COMPAT");
});

// active membership + permissions → effective_permissions present
test("compat scope: response includes effective_permissions from session", () => {
  const userId = "user-002";
  const userData = {
    id: userId,
    email: "front.desk@silversands.com",
    roles: ["Supervisor"],
    permissions: ["rooms:write", "tasks:write", "staff:read"],
    memberships: [{ business_id: "biz-silver-sands", status: "active" }],
  };

  const scope = buildCompatScope(userId, userData);
  expect(scope).not.toBeNull();
  expect(scope!.effective_permissions).toEqual([
    "rooms:write",
    "tasks:write",
    "staff:read",
  ]);
  expect(scope!.is_super_admin).toBe(false);
});

// active membership + no permissions → has_access true, empty effective_permissions
test("compat scope: active membership + no permissions → scope with empty effective_permissions", () => {
  const scope = buildCompatScope("user-003", {
    id: "user-003",
    email: "newuser@silversands.com",
    roles: [],
    permissions: [],
    memberships: [{ business_id: "biz-silver-sands", status: "active" }],
  });
  expect(scope).not.toBeNull();
  expect(scope!.effective_permissions).toEqual([]);
  expect(scope!.is_super_admin).toBe(false);
});

// no memberships + permissions → has_access false
test("compat scope: no memberships + permissions → no compat scope (has_access false)", () => {
  const scope = buildCompatScope("user-004", {
    id: "user-004",
    email: "orphan@example.com",
    roles: ["Staff"],
    permissions: ["rooms:write", "tasks:write"],
    memberships: [],
  });
  // Permissions alone do not confer active membership
  expect(scope).toBeNull();
});

// inactive membership + permissions → has_access false
test("compat scope: inactive membership + permissions → no compat scope (has_access false)", () => {
  const scope = buildCompatScope("user-005", {
    id: "user-005",
    email: "inactive@silversands.com",
    roles: ["Staff"],
    permissions: ["rooms:write"],
    memberships: [{ business_id: "biz-silver-sands", status: "inactive" }],
  });
  expect(scope).toBeNull();
});

// legacy membership (no status field) → has_access true
test("compat scope: legacy membership without status field treated as active", () => {
  const scope = buildCompatScope("user-006", {
    id: "user-006",
    email: "legacy@silversands.com",
    roles: ["Staff"],
    permissions: ["rooms:read"],
    memberships: [{ business_id: "biz-silver-sands" }], // no status → legacy
  });
  expect(scope).not.toBeNull();
  expect(scope!.effective_permissions).toContain("rooms:read");
});

// PythonAnywhere nested response shape
test("compat scope: PythonAnywhere nested user shape is handled", () => {
  const userId = "user-001";
  const userData = {
    user: { id: userId, email: "manager@silversands.com", is_active: true },
    business_id: "biz-silver-sands",
    memberships: [
      { business_id: "biz-silver-sands", status: "active", is_owner: true },
    ],
    roles: ["Owner"],
    permissions: ["*"],
  };

  const scope = buildCompatScope(userId, userData);
  expect(scope).not.toBeNull();
  expect(scope!.effective_permissions).toContain("*");
  expect(scope!.business_id).toBe("biz-silver-sands");
});

// is_super_admin: superadmin:* permission
test("compat scope: superadmin:* permission → is_super_admin true", () => {
  const scope = buildCompatScope("user-007", {
    id: "user-007",
    email: "sadmin@silversands.com",
    roles: [],
    permissions: ["superadmin:*"],
    memberships: [{ business_id: "biz-silver-sands", status: "active" }],
  });
  expect(scope).not.toBeNull();
  expect(scope!.is_super_admin).toBe(true);
});

// is_super_admin: superadmin: prefix
test("compat scope: superadmin: prefix permission → is_super_admin true", () => {
  const scope = buildCompatScope("user-008", {
    id: "user-008",
    email: "sadmin2@silversands.com",
    roles: [],
    permissions: ["superadmin:read", "superadmin:write"],
    memberships: [{ business_id: "biz-silver-sands", status: "active" }],
  });
  expect(scope).not.toBeNull();
  expect(scope!.is_super_admin).toBe(true);
});

