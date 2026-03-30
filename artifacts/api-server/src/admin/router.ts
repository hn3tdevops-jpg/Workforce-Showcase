import { Router, type Request, type Response } from "express";
import { getDb } from "../hospitable/db.js";
import { createHash, randomBytes } from "node:crypto";

const router = Router();

function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function bad(res: Response, msg: string) { res.status(400).json({ detail: msg }); }
function notFound(res: Response, msg = "Not found") { res.status(404).json({ detail: msg }); }
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}

// ── Canonical permission definitions ──────────────────────────────────────────
export const ALL_PERMISSIONS = [
  { key: "*",                    label: "All Permissions (wildcard)", group: "Admin" },
  { key: "settings:read",        label: "View Settings",              group: "Admin" },
  { key: "settings:write",       label: "Manage Settings",            group: "Admin" },
  { key: "reports:read",         label: "View Reports",               group: "Admin" },
  { key: "rooms:read",           label: "View Rooms",                 group: "Rooms" },
  { key: "rooms:write",          label: "Manage Rooms",               group: "Rooms" },
  { key: "tasks:read",           label: "View Tasks",                 group: "Tasks" },
  { key: "tasks:write",          label: "Manage All Tasks",           group: "Tasks" },
  { key: "tasks:write:own",      label: "Manage Own Tasks",           group: "Tasks" },
  { key: "staff:read",           label: "View Staff",                 group: "Staff" },
  { key: "staff:write",          label: "Manage Staff",               group: "Staff" },
  { key: "shifts:read",          label: "View Shifts",                group: "Shifts" },
  { key: "shifts:write",         label: "Manage Shifts",              group: "Shifts" },
  { key: "assignments:read",     label: "View Assignments",           group: "Assignments" },
  { key: "assignments:write",    label: "Manage Assignments",         group: "Assignments" },
  { key: "inventory:read",       label: "View Inventory",             group: "Operations" },
  { key: "inventory:write",      label: "Manage Inventory",           group: "Operations" },
  { key: "maintenance:read",     label: "View Maintenance",           group: "Operations" },
  { key: "maintenance:write",    label: "Manage Maintenance",         group: "Operations" },
  { key: "inspections:read",     label: "View Inspections",           group: "Operations" },
  { key: "inspections:write",    label: "Conduct Inspections",        group: "Operations" },
  { key: "employees:read",       label: "View Employee Profiles",     group: "Employees" },
  { key: "employees:write",      label: "Manage Employee Profiles",   group: "Employees" },
  { key: "communications:read",  label: "View Communications",        group: "Communications" },
  { key: "communications:write", label: "Post Communications",        group: "Communications" },
];

export const DEFAULT_ROLE_TEMPLATES = [
  {
    id: "owner",
    name: "Owner / Manager",
    description: "Full platform access. No restrictions.",
    permissions: ["*"],
    color: "red",
    is_system: true,
  },
  {
    id: "supervisor",
    name: "Supervisor",
    description: "Team lead with write access to core operations and read access to all areas.",
    permissions: ["rooms:write","rooms:read","tasks:write","tasks:read","staff:read",
      "shifts:write","shifts:read","assignments:read","assignments:write",
      "inspections:read","communications:read","communications:write","employees:read"],
    color: "amber",
    is_system: true,
  },
  {
    id: "staff",
    name: "Staff",
    description: "Standard field employee. Can manage their own tasks and view their shift schedule.",
    permissions: ["tasks:read","tasks:write:own","shifts:read","communications:read"],
    color: "blue",
    is_system: true,
  },
  {
    id: "concierge",
    name: "Concierge / Front Desk",
    description: "Guest-facing front-of-house. Read access to rooms, assignments, shifts.",
    permissions: ["rooms:read","assignments:read","shifts:read","communications:read","communications:write"],
    color: "green",
    is_system: true,
  },
  {
    id: "maintenance",
    name: "Maintenance Technician",
    description: "Facilities and maintenance team. Full maintenance access plus task management.",
    permissions: ["maintenance:read","maintenance:write","tasks:read","tasks:write:own","shifts:read","communications:read"],
    color: "orange",
    is_system: true,
  },
  {
    id: "housekeeping",
    name: "Housekeeping Lead",
    description: "Housekeeping oversight. Manages room cleaning tasks and inspections.",
    permissions: ["rooms:read","tasks:write","tasks:read","inspections:write","inspections:read",
      "inventory:read","shifts:read","communications:read","communications:write"],
    color: "violet",
    is_system: true,
  },
];

// ── GET /admin/summary ────────────────────────────────────────────────────────
router.get("/summary", (_req: Request, res: Response) => {
  const db = getDb();
  const stat = (sql: string, ...p: unknown[]) =>
    (db.prepare(sql).get(...p) as { n: number }).n;

  ok(res, {
    businesses:  stat("SELECT COUNT(*) as n FROM business_settings"),
    users:       stat("SELECT COUNT(*) as n FROM local_staff WHERE is_active = 1"),
    employees:   stat("SELECT COUNT(*) as n FROM employee_profiles WHERE is_active = 1"),
    assignments: stat("SELECT COUNT(*) as n FROM employee_role_assignments WHERE is_active = 1"),
    locations:   stat("SELECT COUNT(*) as n FROM local_locations WHERE is_active = 1"),
    pending_invites: stat("SELECT COUNT(*) as n FROM employee_link_invitations WHERE status = 'PENDING'"),
    recent_audit: db.prepare(`
      SELECT wae.event_key AS action, wae.target_type AS entity_type,
        wae.actor_user_id, wae.after_json AS details_after, wae.created_at,
        ls.first_name || ' ' || ls.last_name AS actor_name
      FROM workforce_audit_events wae
      LEFT JOIN local_staff ls ON ls.id = wae.actor_user_id
      ORDER BY wae.created_at DESC LIMIT 12
    `).all(),
  });
});

// ── GET /admin/businesses ─────────────────────────────────────────────────────
router.get("/businesses", (_req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare(`
    SELECT bs.*,
      (SELECT COUNT(*) FROM local_locations ll WHERE ll.business_id = bs.business_id AND ll.is_active = 1) AS location_count,
      (SELECT COUNT(*) FROM employee_profiles ep WHERE ep.business_id = bs.business_id AND ep.is_active = 1) AS employee_count,
      (SELECT COUNT(*) FROM local_staff ls WHERE 1=1) AS user_count
    FROM business_settings bs ORDER BY bs.business_id
  `).all());
});

router.get("/businesses/:bizId", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM business_settings WHERE business_id = ?").get(req.params.bizId) as any;
  if (!row) return notFound(res);
  row.locations = db.prepare("SELECT * FROM local_locations WHERE business_id = ? AND is_active = 1").all(req.params.bizId);
  try { row.enabled_modules = JSON.parse(row.enabled_modules); } catch { row.enabled_modules = []; }
  ok(res, row);
});

router.post("/businesses", (req: Request, res: Response) => {
  const { business_id, display_name, primary_color = "#7c3aed", accent_color = "#d97706", enabled_modules } = req.body;
  if (!business_id?.trim() || !display_name?.trim()) return bad(res, "business_id and display_name required");
  const db = getDb();
  if (db.prepare("SELECT business_id FROM business_settings WHERE business_id = ?").get(business_id.trim())) {
    return bad(res, "Business ID already exists");
  }
  const mods = enabled_modules ?? ["dashboard","rooms","tasks","assignments","shifts","timeline","employees","communications"];
  db.prepare("INSERT INTO business_settings (business_id, display_name, primary_color, accent_color, enabled_modules) VALUES (?, ?, ?, ?, ?)")
    .run(business_id.trim(), display_name.trim(), primary_color, accent_color, JSON.stringify(mods));
  ok(res, db.prepare("SELECT * FROM business_settings WHERE business_id = ?").get(business_id.trim()), 201);
});

router.patch("/businesses/:bizId", (req: Request, res: Response) => {
  const db = getDb();
  if (!db.prepare("SELECT business_id FROM business_settings WHERE business_id = ?").get(req.params.bizId)) return notFound(res);
  const body = req.body as Record<string, unknown>;
  const sets: string[] = []; const vals: unknown[] = [];
  for (const f of ["display_name","primary_color","accent_color","logo_url"] as const) {
    if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); }
  }
  if (body.enabled_modules !== undefined) {
    sets.push("enabled_modules = ?");
    vals.push(Array.isArray(body.enabled_modules) ? JSON.stringify(body.enabled_modules) : body.enabled_modules);
  }
  if (!sets.length) return bad(res, "No fields to update");
  sets.push("updated_at = datetime('now')"); vals.push(req.params.bizId);
  db.prepare(`UPDATE business_settings SET ${sets.join(", ")} WHERE business_id = ?`).run(...vals);
  ok(res, db.prepare("SELECT * FROM business_settings WHERE business_id = ?").get(req.params.bizId));
});

// ── GET /admin/users ──────────────────────────────────────────────────────────
router.get("/users", (_req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare(`
    SELECT ls.*,
      (lco.email IS NOT NULL) AS has_local_cred,
      (SELECT uel.link_status FROM user_employee_links uel WHERE uel.user_id = ls.id AND uel.link_status = 'ACTIVE' LIMIT 1) AS link_status,
      (SELECT ep.legal_first_name || ' ' || ep.legal_last_name
        FROM user_employee_links uel JOIN employee_profiles ep ON ep.id = uel.employee_profile_id
        WHERE uel.user_id = ls.id AND uel.link_status = 'ACTIVE' LIMIT 1) AS ep_name,
      (SELECT ep.employee_code
        FROM user_employee_links uel JOIN employee_profiles ep ON ep.id = uel.employee_profile_id
        WHERE uel.user_id = ls.id AND uel.link_status = 'ACTIVE' LIMIT 1) AS ep_code,
      (SELECT era.role_name
        FROM user_employee_links uel JOIN employee_role_assignments era ON era.employee_profile_id = uel.employee_profile_id
        WHERE uel.user_id = ls.id AND uel.link_status = 'ACTIVE' AND era.is_active = 1 LIMIT 1) AS primary_role,
      (SELECT GROUP_CONCAT(era.role_name, ', ')
        FROM user_employee_links uel JOIN employee_role_assignments era ON era.employee_profile_id = uel.employee_profile_id
        WHERE uel.user_id = ls.id AND uel.link_status = 'ACTIVE' AND era.is_active = 1) AS all_roles
    FROM local_staff ls
    LEFT JOIN local_credential_overrides lco ON lco.email = ls.email
    ORDER BY ls.first_name, ls.last_name
  `).all());
});

router.post("/users", (req: Request, res: Response) => {
  const { email, first_name, last_name, job_title, role = "staff", phone, password } = req.body;
  if (!email?.trim() || !first_name?.trim() || !last_name?.trim()) return bad(res, "email, first_name, last_name required");
  const db = getDb();
  if (db.prepare("SELECT id FROM local_staff WHERE email = ?").get(email.trim().toLowerCase())) return bad(res, "Email already in use");
  const id = `user-${uid().slice(0, 8)}`;
  const emailLc = email.trim().toLowerCase();
  db.prepare("INSERT INTO local_staff (id, email, first_name, last_name, job_title, role, phone) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, emailLc, first_name.trim(), last_name.trim(), job_title ?? null, role, phone ?? null);
  if (password?.trim()) {
    const userJson = JSON.stringify({ id, email: emailLc, first_name: first_name.trim(), last_name: last_name.trim(), is_active: true, business_id: "biz-silver-sands", memberships: [{ business_id: "biz-silver-sands", role }] });
    db.prepare("INSERT OR REPLACE INTO local_credential_overrides (email, pwd_hash, user_json) VALUES (?, ?, ?)")
      .run(emailLc, hashPassword(password.trim()), userJson);
  }
  ok(res, db.prepare("SELECT * FROM local_staff WHERE id = ?").get(id), 201);
});

router.patch("/users/:userId", (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare("SELECT * FROM local_staff WHERE id = ?").get(req.params.userId) as any;
  if (!user) return notFound(res);
  const body = req.body as Record<string, unknown>;
  const sets: string[] = []; const vals: unknown[] = [];
  for (const f of ["first_name","last_name","email","job_title","role","phone","is_active"] as const) {
    if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); }
  }
  if (body.password?.toString().trim()) {
    const em = ((body.email as string) ?? user.email).trim().toLowerCase();
    const fn = ((body.first_name as string) ?? user.first_name).trim();
    const ln = ((body.last_name as string) ?? user.last_name).trim();
    const rl = (body.role as string) ?? user.role;
    const userJson = JSON.stringify({ id: req.params.userId, email: em, first_name: fn, last_name: ln, is_active: true, business_id: "biz-silver-sands", memberships: [{ business_id: "biz-silver-sands", role: rl }] });
    db.prepare("INSERT OR REPLACE INTO local_credential_overrides (email, pwd_hash, user_json) VALUES (?, ?, ?)")
      .run(em, hashPassword(body.password.toString().trim()), userJson);
  }
  if (sets.length) {
    sets.push("updated_at = datetime('now')"); vals.push(req.params.userId);
    db.prepare(`UPDATE local_staff SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }
  ok(res, db.prepare("SELECT * FROM local_staff WHERE id = ?").get(req.params.userId));
});

router.delete("/users/:userId", (req: Request, res: Response) => {
  const db = getDb();
  const r = db.prepare("UPDATE local_staff SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(req.params.userId);
  if (r.changes === 0) return notFound(res);
  ok(res, { ok: true });
});

// ── GET /admin/roles ──────────────────────────────────────────────────────────
router.get("/roles", (_req: Request, res: Response) => ok(res, DEFAULT_ROLE_TEMPLATES));

// ── GET /admin/permissions ────────────────────────────────────────────────────
router.get("/permissions", (_req: Request, res: Response) => ok(res, ALL_PERMISSIONS));

// ── GET /admin/permissions/matrix ─────────────────────────────────────────────
router.get("/permissions/matrix", (_req: Request, res: Response) => {
  ok(res, { roles: DEFAULT_ROLE_TEMPLATES, permissions: ALL_PERMISSIONS });
});

// ── GET /admin/permissions/assignments ────────────────────────────────────────
router.get("/permissions/assignments", (req: Request, res: Response) => {
  const db = getDb();
  const { role, dept, scope } = req.query;
  let where = "WHERE era.is_active = 1";
  const params: unknown[] = [];
  if (role)  { where += " AND era.role_name = ?"; params.push(role); }
  if (dept)  { where += " AND ep.department = ?";  params.push(dept); }
  if (scope) { where += " AND era.scope_type = ?"; params.push(scope); }
  ok(res, db.prepare(`
    SELECT era.*,
      ep.legal_first_name || ' ' || ep.legal_last_name AS employee_name,
      ep.job_title, ep.department, ep.employee_code, ep.employment_status,
      ll.name AS location_name
    FROM employee_role_assignments era
    JOIN employee_profiles ep ON ep.id = era.employee_profile_id
    LEFT JOIN local_locations ll ON ll.id = era.location_id
    ${where}
    ORDER BY era.role_name, ep.legal_last_name
  `).all(...params));
});

// ── PATCH /admin/permissions/assignments/:id ──────────────────────────────────
router.patch("/permissions/assignments/:id", (req: Request, res: Response) => {
  const db = getDb();
  const era = db.prepare("SELECT * FROM employee_role_assignments WHERE id = ?").get(req.params.id) as any;
  if (!era) return notFound(res);
  const { permissions, is_active, role_name } = req.body;
  const sets: string[] = []; const vals: unknown[] = [];
  if (permissions !== undefined) { sets.push("permissions = ?"); vals.push(JSON.stringify(permissions)); }
  if (is_active  !== undefined) { sets.push("is_active = ?");   vals.push(is_active ? 1 : 0); }
  if (role_name  !== undefined) { sets.push("role_name = ?");   vals.push(role_name); }
  if (!sets.length) return bad(res, "Nothing to update");
  sets.push("updated_at = datetime('now')"); vals.push(req.params.id);
  db.prepare(`UPDATE employee_role_assignments SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  ok(res, db.prepare("SELECT * FROM employee_role_assignments WHERE id = ?").get(req.params.id));
});

// ── GET /admin/permissions/user/:userId ───────────────────────────────────────
router.get("/permissions/user/:userId", (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare("SELECT * FROM local_staff WHERE id = ?").get(req.params.userId) as any;
  if (!user) return notFound(res);
  const links = db.prepare(`
    SELECT uel.*, ep.legal_first_name || ' ' || ep.legal_last_name AS ep_name, ep.employee_code
    FROM user_employee_links uel
    JOIN employee_profiles ep ON ep.id = uel.employee_profile_id
    WHERE uel.user_id = ? AND uel.link_status = 'ACTIVE'
  `).all(req.params.userId) as any[];
  const assignments: any[] = [];
  const allPerms = new Set<string>();
  for (const link of links) {
    const eras = db.prepare(`
      SELECT era.*, ll.name AS location_name
      FROM employee_role_assignments era
      LEFT JOIN local_locations ll ON ll.id = era.location_id
      WHERE era.employee_profile_id = ? AND era.is_active = 1
    `).all(link.employee_profile_id) as any[];
    for (const a of eras) {
      const perms: string[] = (() => { try { return JSON.parse(a.permissions); } catch { return []; } })();
      perms.forEach(p => allPerms.add(p));
      assignments.push({ ...a, permissions: perms });
    }
  }
  ok(res, { user, links, assignments, effective_permissions: [...allPerms] });
});

// ── POST /admin/setup/property ────────────────────────────────────────────────
router.post("/setup/property", (req: Request, res: Response) => {
  const {
    business_id, display_name, address = "", timezone = "America/New_York",
    primary_color = "#7c3aed", accent_color = "#d97706", enabled_modules,
    admin_email, admin_first_name, admin_last_name, admin_password,
    admin_job_title = "General Manager",
  } = req.body;
  if (!business_id?.trim()) return bad(res, "business_id required");
  if (!display_name?.trim()) return bad(res, "display_name required");
  if (!admin_email?.trim() || !admin_first_name?.trim() || !admin_last_name?.trim()) {
    return bad(res, "admin_email, admin_first_name, admin_last_name required");
  }
  const db = getDb();
  if (db.prepare("SELECT business_id FROM business_settings WHERE business_id = ?").get(business_id.trim())) {
    return bad(res, "Business ID already exists");
  }
  const mods = enabled_modules ?? [
    "dashboard","rooms","property-map","tasks","assignments","shifts",
    "timeline","users","employees","promotions","inspections",
    "session","inventory","maintenance","communications",
  ];
  db.prepare("INSERT INTO business_settings (business_id, display_name, primary_color, accent_color, enabled_modules) VALUES (?, ?, ?, ?, ?)")
    .run(business_id.trim(), display_name.trim(), primary_color, accent_color, JSON.stringify(mods));
  const locationId = `loc-${uid().slice(0, 6)}`;
  db.prepare("INSERT INTO local_locations (id, business_id, name, address, timezone) VALUES (?, ?, ?, ?, ?)")
    .run(locationId, business_id.trim(), display_name.trim(), address, timezone);
  const userId = `user-${uid().slice(0, 8)}`;
  const emailLc = admin_email.trim().toLowerCase();
  db.prepare("INSERT INTO local_staff (id, email, first_name, last_name, job_title, role) VALUES (?, ?, ?, ?, ?, 'owner')")
    .run(userId, emailLc, admin_first_name.trim(), admin_last_name.trim(), admin_job_title);
  if (admin_password?.trim()) {
    const userJson = JSON.stringify({ id: userId, email: emailLc, first_name: admin_first_name.trim(), last_name: admin_last_name.trim(), is_active: true, business_id: business_id.trim(), memberships: [{ business_id: business_id.trim(), role: "owner" }] });
    db.prepare("INSERT OR REPLACE INTO local_credential_overrides (email, pwd_hash, user_json) VALUES (?, ?, ?)")
      .run(emailLc, hashPassword(admin_password.trim()), userJson);
  }
  const epId = `ep-${uid().slice(0, 8)}`;
  db.prepare("INSERT INTO employee_profiles (id, business_id, legal_first_name, legal_last_name, job_title, department, employment_status, is_active) VALUES (?, ?, ?, ?, ?, 'Management', 'ACTIVE', 1)")
    .run(epId, business_id.trim(), admin_first_name.trim(), admin_last_name.trim(), admin_job_title);
  const linkId = `uel-${uid().slice(0, 8)}`;
  db.prepare("INSERT INTO user_employee_links (id, user_id, employee_profile_id, link_status, is_primary) VALUES (?, ?, ?, 'ACTIVE', 1)")
    .run(linkId, userId, epId);
  db.prepare("INSERT INTO employee_role_assignments (id, employee_profile_id, business_id, scope_type, role_name, permissions, assigned_by_user_id, is_active) VALUES (?, ?, ?, 'BUSINESS', 'owner', '[\"*\"]', 'superadmin', 1)")
    .run(`era-${uid().slice(0, 8)}`, epId, business_id.trim());
  ok(res, { business_id: business_id.trim(), location_id: locationId, user_id: userId, employee_profile_id: epId, display_name: display_name.trim(), admin_email: emailLc }, 201);
});

export default router;
