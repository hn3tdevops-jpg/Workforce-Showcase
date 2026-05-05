import { Router } from "express";
import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from "node:crypto";
import { getDb } from "../hospitable/db.js";

const PA_BASE = "https://hn3t.pythonanywhere.com";

const router = Router();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const inputHash = scryptSync(password, salt, 64);
    return timingSafeEqual(Buffer.from(hash, "hex"), inputHash);
  } catch {
    return false;
  }
}

const SILVER_SANDS_BUSINESS_ID = "biz-silver-sands";

function buildMinimalUser(email: string) {
  return {
    id: `local-${email}`,
    email,
    first_name: email.split("@")[0],
    last_name: "",
    is_active: true,
    active_business_id: SILVER_SANDS_BUSINESS_ID,
    role: "admin",
    roles: ["admin", "owner"],
    permissions: ["*"],
    memberships: [
      {
        business_id: SILVER_SANDS_BUSINESS_ID,
        business_name: "Silver Sands Motel",
        role: "owner",
      },
    ],
  };
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(422).json({ detail: "Email and password are required." });
    return;
  }

  const db = getDb();
  const row = db
    .prepare("SELECT pwd_hash, user_json FROM local_credential_overrides WHERE email = ?")
    .get(email) as { pwd_hash: string; user_json: string } | undefined;

  if (row && verifyPassword(password, row.pwd_hash)) {
    const token = randomUUID();
    db.prepare(
      "INSERT INTO local_sessions (token, email, user_json) VALUES (?, ?, ?)"
    ).run(token, email, row.user_json);

    res.json({ access_token: token, token_type: "bearer" });
    return;
  }

  const upstreamRes = await fetch(`${PA_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req.body),
  });

  const text = await upstreamRes.text();
  const contentType = upstreamRes.headers.get("content-type");
  if (contentType) res.setHeader("content-type", contentType);
  res.status(upstreamRes.status).send(text);
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (token) {
    const db = getDb();
    const row = db
      .prepare("SELECT user_json FROM local_sessions WHERE token = ?")
      .get(token) as { user_json: string } | undefined;

    if (row) {
      res.json(JSON.parse(row.user_json));
      return;
    }
  }

  const upstreamRes = await fetch(`${PA_BASE}/api/v1/auth/me`, {
    headers: authHeader ? { authorization: authHeader } : {},
  });

  const text = await upstreamRes.text();
  const contentType = upstreamRes.headers.get("content-type");
  if (contentType) res.setHeader("content-type", contentType);
  res.status(upstreamRes.status).send(text);
});

router.get("/me/access-context", async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  let userId: string | null = null;
  // Keep full user data for the compatibility fallback when no employee links exist
  let userData: Record<string, unknown> | null = null;

  if (token) {
    const db = getDb();
    const row = db.prepare("SELECT user_json FROM local_sessions WHERE token = ?").get(token) as { user_json: string } | undefined;
    if (row) {
      try {
        userData = JSON.parse(row.user_json) as Record<string, unknown>;
        userId = (userData.id as string) ?? null;
      } catch { /* ignore */ }
    }
  }

  if (!userId) {
    // Try upstream user then resolve locally
    const upstreamRes = await fetch(`${PA_BASE}/api/v1/auth/me`, {
      headers: authHeader ? { authorization: authHeader } : {},
    });
    if (upstreamRes.ok) {
      // PythonAnywhere shape: { user: { id }, permissions, roles, memberships }
      // Legacy flat shape:    { id, permissions, roles, memberships }
      const raw = await upstreamRes.json() as Record<string, unknown>;
      const nested = raw.user as Record<string, unknown> | undefined;
      userId = (nested?.id ?? raw.id) as string | null;
      userData = raw;
    }
  }

  if (!userId) {
    res.status(401).json({ detail: "Not authenticated" });
    return;
  }

  const db = getDb();
  const activeLinks = db.prepare(`
    SELECT uel.*, ep.employment_status, ep.is_active AS ep_is_active,
      ep.legal_first_name, ep.legal_last_name, ep.job_title, ep.department,
      ep.employee_code, ep.business_id
    FROM user_employee_links uel
    JOIN employee_profiles ep ON ep.id = uel.employee_profile_id
    WHERE uel.user_id = ? AND uel.link_status = 'ACTIVE'
      AND ep.is_active = 1 AND ep.employment_status = 'ACTIVE'
  `).all(userId) as any[];

  const scopes: any[] = [];
  for (const link of activeLinks) {
    const assignments = db.prepare(`
      SELECT era.*, ll.name AS location_name
      FROM employee_role_assignments era
      LEFT JOIN local_locations ll ON ll.id = era.location_id
      WHERE era.employee_profile_id = ? AND era.is_active = 1
    `).all(link.employee_profile_id) as any[];

    const allPerms = new Set<string>();
    for (const a of assignments) {
      try { (JSON.parse(a.permissions) as string[]).forEach(p => allPerms.add(p)); } catch { /* ignore */ }
    }

    scopes.push({
      employee_profile_id: link.employee_profile_id,
      link_id:             link.id,
      link_status:         link.link_status,
      business_id:         link.business_id,
      employee_name:       `${link.legal_first_name} ${link.legal_last_name}`,
      job_title:           link.job_title,
      department:          link.department,
      employee_code:       link.employee_code,
      employment_status:   link.employment_status,
      assignments:         assignments.map((a: any) => ({
        id: a.id, role_name: a.role_name, scope_type: a.scope_type,
        location_id: a.location_id, location_name: a.location_name,
        permissions: (() => { try { return JSON.parse(a.permissions); } catch { return []; } })(),
      })),
      effective_permissions: [...allPerms],
      is_super_admin: allPerms.has("*"),
    });
  }

  // Compatibility fallback: if no employee-profile links exist in the local DB,
  // synthesise a single scope from the user's current RBAC permissions so the
  // frontend's `employmentScope` is never silently null for authenticated members.
  // This does NOT bypass RBAC — it uses only the permissions already granted via
  // the auth token / session, and correctly reports is_super_admin.
  if (scopes.length === 0 && userData !== null) {
    const permissions = (userData.permissions ?? []) as string[];
    const memberships = (userData.memberships ?? []) as Array<Record<string, unknown>>;
    const nested = userData.user as Record<string, unknown> | undefined;

    // Consider the user as having active access when they carry any permissions
    // or have at least one membership (active or otherwise — no status means legacy
    // records where all memberships were implicitly active).
    const hasActiveMembership =
      permissions.length > 0 ||
      memberships.some((m) => !m.status || m.status === "active");

    if (hasActiveMembership) {
      const activeMembership =
        memberships.find((m) => !m.status || m.status === "active") ??
        memberships[0] ??
        null;

      const roleNames = (userData.roles ?? []) as string[];
      const compatAssignments = roleNames.map((r, i) => ({
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

      scopes.push({
        employee_profile_id: `compat-ep-${userId}`,
        link_id:             `compat-link-${userId}`,
        link_status:         "COMPAT",
        business_id:
          (userData.active_business_id ??
           userData.business_id ??
           activeMembership?.business_id ??
           SILVER_SANDS_BUSINESS_ID) as string,
        employee_name:       `${firstName} ${lastName}`.trim() || email,
        job_title:           jobTitle,
        department:          null,
        employee_code:       null,
        employment_status:   "ACTIVE",
        assignments:         compatAssignments,
        effective_permissions: permissions,
        is_super_admin:      permissions.includes("*"),
      });
    }
  }

  res.json({
    user_id: userId,
    has_access: scopes.length > 0,
    active_scope_count: scopes.length,
    scopes,
    resolved_at: new Date().toISOString(),
  });
});

router.post("/reset", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ detail: "This endpoint is not available in production." });
    return;
  }

  const { email, new_password } = req.body ?? {};
  if (!email || !new_password) {
    res.status(422).json({ detail: "email and new_password are required." });
    return;
  }
  if (typeof new_password !== "string" || new_password.length < 8) {
    res.status(422).json({ detail: "Password must be at least 8 characters." });
    return;
  }

  const db = getDb();
  const userJson = JSON.stringify(buildMinimalUser(email));
  const pwdHash = hashPassword(new_password);

  db.prepare(`
    INSERT INTO local_credential_overrides (email, pwd_hash, user_json, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(email) DO UPDATE SET
      pwd_hash   = excluded.pwd_hash,
      user_json  = excluded.user_json,
      updated_at = excluded.updated_at
  `).run(email, pwdHash, userJson);

  res.json({ ok: true, message: "Local password override saved. You can now sign in with these credentials." });
});

export default router;
