import { Router, type Request, type Response } from "express";
import { getDb } from "../hospitable/db.js";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function now(): string { return new Date().toISOString(); }
function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function notFound(res: Response, msg = "Not found") { res.status(404).json({ detail: msg }); }
function bad(res: Response, msg: string) { res.status(400).json({ detail: msg }); }
function conflict(res: Response, msg: string) { res.status(409).json({ detail: msg }); }

/** Write an audit row */
function audit(
  db: ReturnType<typeof getDb>,
  event_key: string,
  target_type: string,
  target_id: string,
  opts: {
    actor_user_id?: string;
    actor_type?: string;
    actor_ep_id?: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
    meta?: unknown;
    related_user_id?: string;
    related_ep_id?: string;
  } = {},
) {
  db.prepare(`
    INSERT INTO workforce_audit_events
      (id, event_key, actor_type, actor_user_id, actor_employee_profile_id,
       target_type, target_id, business_id, related_user_id, related_employee_profile_id,
       reason, before_json, after_json, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'biz-silver-sands', ?, ?, ?, ?, ?, ?)
  `).run(
    uid(),
    event_key,
    opts.actor_type ?? "USER",
    opts.actor_user_id ?? null,
    opts.actor_ep_id ?? null,
    target_type,
    target_id,
    opts.related_user_id ?? null,
    opts.related_ep_id ?? null,
    opts.reason ?? null,
    opts.before ? JSON.stringify(opts.before) : null,
    opts.after  ? JSON.stringify(opts.after)  : null,
    opts.meta   ? JSON.stringify(opts.meta)   : null,
  );
}

const EP_SELECT = `
  SELECT
    ep.*,
    ls.email              AS staff_email,
    ls.first_name         AS staff_first_name,
    ls.last_name          AS staff_last_name,
    m.display_name        AS manager_name,
    uel.id                AS link_id,
    uel.link_status       AS link_status,
    uel.linked_at         AS linked_at,
    (SELECT COUNT(*) FROM employee_role_assignments era
     WHERE era.employee_profile_id = ep.id AND era.is_active = 1) AS active_role_count
  FROM employee_profiles ep
  LEFT JOIN local_staff   ls  ON ls.id = ep.staff_id
  LEFT JOIN employee_profiles m ON m.id = ep.manager_employee_id
  LEFT JOIN user_employee_links uel ON uel.employee_profile_id = ep.id AND uel.is_primary = 1
`;

// ── Employee Profile Endpoints ────────────────────────────────────────────────

/** GET /workforce/employees */
router.get("/employees", (req: Request, res: Response) => {
  const db = getDb();
  const {
    status,
    department,
    search,
    limit = 100,
    skip = 0,
  } = req.query;

  let where = "WHERE ep.business_id = 'biz-silver-sands'";
  const params: unknown[] = [];

  if (status)     { where += " AND ep.employment_status = ?"; params.push(status); }
  if (department) { where += " AND ep.department = ?";        params.push(department); }
  if (search) {
    where += " AND (ep.legal_first_name || ' ' || ep.legal_last_name LIKE ? OR ep.work_email LIKE ? OR ep.employee_code LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const rows = db.prepare(`${EP_SELECT} ${where} ORDER BY ep.legal_first_name, ep.legal_last_name LIMIT ? OFFSET ?`)
    .all(...params, +limit, +skip);

  ok(res, rows);
});

/** GET /workforce/employees/:id */
router.get("/employees/:id", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(`${EP_SELECT} WHERE ep.id = ?`).get(req.params.id);
  if (!row) return notFound(res, "Employee profile not found");
  ok(res, row);
});

/** POST /workforce/employees */
router.post("/employees", (req: Request, res: Response) => {
  const {
    legal_first_name, legal_last_name,
    display_name, work_email, work_phone,
    employment_type = "FULL_TIME",
    hire_date, department, job_title,
    location_id, staff_id, employee_code,
    actor_user_id,
  } = req.body;

  if (!legal_first_name || !legal_last_name) return bad(res, "legal_first_name and legal_last_name required");

  const db = getDb();
  const id = uid();

  db.prepare(`
    INSERT INTO employee_profiles
      (id, business_id, location_id, staff_id, employee_code,
       legal_first_name, legal_last_name, display_name, work_email, work_phone,
       employment_status, employment_type, hire_date, department, job_title,
       is_active, created_by_user_id)
    VALUES (?, 'biz-silver-sands', ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_HIRE', ?, ?, ?, ?, 1, ?)
  `).run(
    id, location_id ?? null, staff_id ?? null, employee_code ?? null,
    legal_first_name, legal_last_name, display_name ?? null, work_email ?? null, work_phone ?? null,
    employment_type, hire_date ?? null, department ?? null, job_title ?? null,
    actor_user_id ?? null,
  );

  audit(db, "employee_profile.create", "employee_profile", id, {
    actor_user_id,
    after: { employment_status: "PENDING_HIRE", legal_first_name, legal_last_name },
  });

  const row = db.prepare(`${EP_SELECT} WHERE ep.id = ?`).get(id);
  ok(res, row, 201);
});

/** PATCH /workforce/employees/:id — employer-managed fields only */
router.patch("/employees/:id", (req: Request, res: Response) => {
  const db = getDb();
  const ep = db.prepare("SELECT * FROM employee_profiles WHERE id = ?").get(req.params.id) as any;
  if (!ep) return notFound(res, "Employee profile not found");

  const {
    display_name, work_email, work_phone,
    employment_type, hire_date, department, job_title,
    location_id, manager_employee_id, schedule_eligible, internal_notes,
    employee_code, actor_user_id,
  } = req.body;

  const before = { ...ep };
  db.prepare(`
    UPDATE employee_profiles SET
      display_name          = COALESCE(?, display_name),
      work_email            = COALESCE(?, work_email),
      work_phone            = COALESCE(?, work_phone),
      employment_type       = COALESCE(?, employment_type),
      hire_date             = COALESCE(?, hire_date),
      department            = COALESCE(?, department),
      job_title             = COALESCE(?, job_title),
      location_id           = COALESCE(?, location_id),
      manager_employee_id   = COALESCE(?, manager_employee_id),
      schedule_eligible     = COALESCE(?, schedule_eligible),
      internal_notes        = COALESCE(?, internal_notes),
      employee_code         = COALESCE(?, employee_code),
      updated_by_user_id    = ?,
      updated_at            = datetime('now')
    WHERE id = ?
  `).run(
    display_name ?? null, work_email ?? null, work_phone ?? null,
    employment_type ?? null, hire_date ?? null, department ?? null, job_title ?? null,
    location_id ?? null, manager_employee_id ?? null,
    schedule_eligible != null ? +schedule_eligible : null,
    internal_notes ?? null, employee_code ?? null,
    actor_user_id ?? null,
    req.params.id,
  );

  const after = db.prepare("SELECT * FROM employee_profiles WHERE id = ?").get(req.params.id);
  audit(db, "employee_profile.update", "employee_profile", req.params.id, {
    actor_user_id, before, after,
  });

  ok(res, db.prepare(`${EP_SELECT} WHERE ep.id = ?`).get(req.params.id));
});

// ── Lifecycle Transitions ─────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, { from: string[]; to: string; event: string }> = {
  "activate-employment":   { from: ["APPLICANT", "PENDING_HIRE"], to: "ACTIVE",       event: "employee_profile.hire_activate" },
  "start-leave":           { from: ["ACTIVE"],                    to: "ON_LEAVE",     event: "employee_profile.leave_start" },
  "end-leave":             { from: ["ON_LEAVE"],                  to: "ACTIVE",       event: "employee_profile.leave_end" },
  "suspend-employment":    { from: ["ACTIVE", "ON_LEAVE"],        to: "SUSPENDED",    event: "employee_profile.suspend" },
  "reinstate-employment":  { from: ["SUSPENDED"],                 to: "ACTIVE",       event: "employee_profile.reinstate" },
  "terminate":             { from: ["ACTIVE","ON_LEAVE","SUSPENDED"], to: "TERMINATED", event: "employee_profile.terminate" },
  "archive":               { from: ["TERMINATED"],                to: "ARCHIVED",     event: "employee_profile.archive" },
  "rehire":                { from: ["TERMINATED", "ARCHIVED"],    to: "ACTIVE",       event: "employee_profile.rehire" },
};

Object.entries(VALID_TRANSITIONS).forEach(([action, { from, to, event: evKey }]) => {
  router.post(`/employees/:id/${action}`, (req: Request, res: Response) => {
    const db = getDb();
    const ep = db.prepare("SELECT * FROM employee_profiles WHERE id = ?").get(req.params.id) as any;
    if (!ep) return notFound(res, "Employee profile not found");
    if (!from.includes(ep.employment_status)) {
      return bad(res, `Cannot ${action} from status '${ep.employment_status}'. Allowed from: ${from.join(", ")}`);
    }

    const { reason, actor_user_id } = req.body;
    const before = { employment_status: ep.employment_status };

    const extra: Record<string, string | null> = {};
    if (to === "TERMINATED") extra.termination_date = now().slice(0, 10);
    if (to === "ACTIVE" && ep.employment_status === "PENDING_HIRE") extra.hire_date = ep.hire_date ?? now().slice(0, 10);

    db.prepare(`
      UPDATE employee_profiles SET
        employment_status = ?,
        is_active         = ?,
        termination_date  = COALESCE(?, termination_date),
        hire_date         = COALESCE(?, hire_date),
        updated_at        = datetime('now')
      WHERE id = ?
    `).run(to, to === "TERMINATED" || to === "ARCHIVED" ? 0 : 1, extra.termination_date ?? null, extra.hire_date ?? null, req.params.id);

    audit(db, evKey, "employee_profile", req.params.id, {
      actor_user_id, reason, before, after: { employment_status: to },
    });

    ok(res, db.prepare(`${EP_SELECT} WHERE ep.id = ?`).get(req.params.id));
  });
});

// ── Links ─────────────────────────────────────────────────────────────────────

/** GET /workforce/employees/:id/links */
router.get("/employees/:id/links", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare(`
    SELECT uel.*,
      ls.email AS user_email,
      ls.first_name || ' ' || ls.last_name AS user_name
    FROM user_employee_links uel
    LEFT JOIN local_staff ls ON ls.id = uel.user_id
    WHERE uel.employee_profile_id = ?
    ORDER BY uel.created_at DESC
  `).all(req.params.id));
});

/** POST /workforce/employees/:id/links — create link for existing staff user */
router.post("/employees/:id/links", (req: Request, res: Response) => {
  const { user_id, actor_user_id } = req.body;
  if (!user_id) return bad(res, "user_id required");
  const db = getDb();

  const ep = db.prepare("SELECT id FROM employee_profiles WHERE id = ?").get(req.params.id) as any;
  if (!ep) return notFound(res, "Employee profile not found");

  const existing = db.prepare(
    "SELECT id, link_status FROM user_employee_links WHERE user_id = ? AND employee_profile_id = ?"
  ).get(user_id, req.params.id) as any;

  if (existing?.link_status === "ACTIVE") return conflict(res, "An active link already exists for this user/employee pair");

  const id = uid();
  db.prepare(`
    INSERT OR IGNORE INTO user_employee_links
      (id, user_id, employee_profile_id, link_status, is_primary, linked_at)
    VALUES (?, ?, ?, 'PENDING', 1, null)
  `).run(id, user_id, req.params.id);

  audit(db, "user_employee_link.create", "user_employee_link", id, {
    actor_user_id, after: { user_id, employee_profile_id: req.params.id, link_status: "PENDING" },
  });

  ok(res, db.prepare("SELECT * FROM user_employee_links WHERE id = ?").get(id), 201);
});

/** POST /workforce/employees/:id/invite-link */
router.post("/employees/:id/invite-link", (req: Request, res: Response) => {
  const { target_email, actor_user_id } = req.body;
  if (!target_email) return bad(res, "target_email required");
  const db = getDb();

  const ep = db.prepare("SELECT id FROM employee_profiles WHERE id = ?").get(req.params.id) as any;
  if (!ep) return notFound(res, "Employee profile not found");

  const token = uid() + uid();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const id = uid();

  db.prepare(`
    INSERT INTO employee_link_invitations
      (id, business_id, employee_profile_id, target_email, invite_token, status, expires_at, created_by_user_id)
    VALUES (?, 'biz-silver-sands', ?, ?, ?, 'PENDING', ?, ?)
  `).run(id, req.params.id, target_email, token, expiresAt, actor_user_id ?? null);

  audit(db, "employee_link_invitation.create", "employee_link_invitation", id, {
    actor_user_id, after: { target_email, employee_profile_id: req.params.id },
  });

  ok(res, {
    id,
    target_email,
    invite_token: token,
    expires_at: expiresAt,
    status: "PENDING",
  }, 201);
});

// ── Link Lifecycle Actions ────────────────────────────────────────────────────

const LINK_TRANSITIONS: Record<string, { from: string[]; to: string; event: string }> = {
  activate: { from: ["PENDING", "SUSPENDED"], to: "ACTIVE",    event: "user_employee_link.activate" },
  suspend:  { from: ["ACTIVE"],               to: "SUSPENDED", event: "user_employee_link.suspend" },
  revoke:   { from: ["PENDING","ACTIVE","SUSPENDED"], to: "REVOKED", event: "user_employee_link.revoke" },
  end:      { from: ["ACTIVE","SUSPENDED","REVOKED"], to: "ENDED",   event: "user_employee_link.end" },
};

Object.entries(LINK_TRANSITIONS).forEach(([action, { from, to, event: evKey }]) => {
  router.post(`/links/:id/${action}`, (req: Request, res: Response) => {
    const db = getDb();
    const link = db.prepare("SELECT * FROM user_employee_links WHERE id = ?").get(req.params.id) as any;
    if (!link) return notFound(res, "Link not found");
    if (!from.includes(link.link_status)) {
      return bad(res, `Cannot ${action} link from status '${link.link_status}'`);
    }

    const { reason, actor_user_id } = req.body;
    const before = { link_status: link.link_status };

    db.prepare(`
      UPDATE user_employee_links SET
        link_status          = ?,
        activated_by_user_id = CASE WHEN ? = 'ACTIVE'  THEN COALESCE(?, activated_by_user_id) ELSE activated_by_user_id END,
        ended_by_user_id     = CASE WHEN ? IN ('REVOKED','ENDED') THEN COALESCE(?, ended_by_user_id) ELSE ended_by_user_id END,
        linked_at            = CASE WHEN ? = 'ACTIVE' AND linked_at IS NULL THEN datetime('now') ELSE linked_at END,
        unlinked_at          = CASE WHEN ? IN ('REVOKED','ENDED') THEN datetime('now') ELSE unlinked_at END,
        ended_reason         = COALESCE(?, ended_reason),
        updated_at           = datetime('now')
      WHERE id = ?
    `).run(
      to,
      to, actor_user_id ?? null,
      to, actor_user_id ?? null,
      to,
      to,
      reason ?? null,
      req.params.id,
    );

    audit(db, evKey, "user_employee_link", req.params.id, {
      actor_user_id, reason, before, after: { link_status: to },
      related_ep_id: link.employee_profile_id,
      related_user_id: link.user_id,
    });

    ok(res, db.prepare("SELECT * FROM user_employee_links WHERE id = ?").get(req.params.id));
  });
});

// ── Role Assignments ──────────────────────────────────────────────────────────

/** GET /workforce/employees/:id/role-assignments */
router.get("/employees/:id/role-assignments", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare(`
    SELECT era.*,
      ll.name AS location_name
    FROM employee_role_assignments era
    LEFT JOIN local_locations ll ON ll.id = era.location_id
    WHERE era.employee_profile_id = ?
    ORDER BY era.is_active DESC, era.created_at DESC
  `).all(req.params.id));
});

/** POST /workforce/employees/:id/role-assignments */
router.post("/employees/:id/role-assignments", (req: Request, res: Response) => {
  const { role_name, scope_type = "BUSINESS", location_id, permissions = [], actor_user_id } = req.body;
  if (!role_name) return bad(res, "role_name required");

  const db = getDb();
  const ep = db.prepare("SELECT id FROM employee_profiles WHERE id = ?").get(req.params.id) as any;
  if (!ep) return notFound(res, "Employee profile not found");

  if (scope_type === "LOCATION" && !location_id) return bad(res, "location_id required for LOCATION scope");

  const id = uid();
  db.prepare(`
    INSERT INTO employee_role_assignments
      (id, employee_profile_id, business_id, scope_type, location_id, role_name,
       permissions, assigned_by_user_id, is_active)
    VALUES (?, ?, 'biz-silver-sands', ?, ?, ?, ?, ?, 1)
  `).run(id, req.params.id, scope_type, location_id ?? null, role_name, JSON.stringify(permissions), actor_user_id ?? null);

  audit(db, "employee_role_assignment.add", "employee_role_assignment", id, {
    actor_user_id, after: { role_name, scope_type, employee_profile_id: req.params.id },
    related_ep_id: req.params.id,
  });

  ok(res, db.prepare("SELECT * FROM employee_role_assignments WHERE id = ?").get(id), 201);
});

/** DELETE /workforce/role-assignments/:id */
router.delete("/role-assignments/:id", (req: Request, res: Response) => {
  const db = getDb();
  const era = db.prepare("SELECT * FROM employee_role_assignments WHERE id = ?").get(req.params.id) as any;
  if (!era) return notFound(res, "Role assignment not found");

  const { actor_user_id } = req.body ?? {};
  db.prepare("UPDATE employee_role_assignments SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  audit(db, "employee_role_assignment.deactivate", "employee_role_assignment", req.params.id, {
    actor_user_id, before: { is_active: 1, role_name: era.role_name },
    after: { is_active: 0 }, related_ep_id: era.employee_profile_id,
  });

  ok(res, { ok: true });
});

// ── Effective Access Resolver ─────────────────────────────────────────────────

/** GET /workforce/access-context?user_id=... */
router.get("/access-context", (req: Request, res: Response) => {
  const user_id = req.query.user_id as string | undefined;
  if (!user_id) return bad(res, "user_id query parameter required");

  const db = getDb();

  // 1. Find active link(s) for this user
  const activeLinks = db.prepare(`
    SELECT uel.*, ep.employment_status, ep.is_active AS ep_is_active,
      ep.legal_first_name, ep.legal_last_name, ep.job_title, ep.department,
      ep.employee_code, ep.business_id
    FROM user_employee_links uel
    JOIN employee_profiles ep ON ep.id = uel.employee_profile_id
    WHERE uel.user_id = ? AND uel.link_status = 'ACTIVE'
      AND ep.is_active = 1 AND ep.employment_status = 'ACTIVE'
  `).all(user_id) as any[];

  // 2. For each active link, load role assignments → build scoped permissions
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
      try { (JSON.parse(a.permissions) as string[]).forEach(p => allPerms.add(p)); }
      catch { /* ignore */ }
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
      assignments:         assignments.map(a => ({
        id: a.id, role_name: a.role_name, scope_type: a.scope_type,
        location_id: a.location_id, location_name: a.location_name,
        permissions: (() => { try { return JSON.parse(a.permissions); } catch { return []; } })(),
      })),
      effective_permissions: [...allPerms],
      is_super_admin: allPerms.has("*"),
    });
  }

  ok(res, {
    user_id,
    has_access: scopes.length > 0,
    active_scope_count: scopes.length,
    scopes,
    resolved_at: now(),
  });
});

// ── Audit Log ─────────────────────────────────────────────────────────────────

/** GET /workforce/audit */
router.get("/audit", (req: Request, res: Response) => {
  const db = getDb();
  const { event_key, target_id, user_id, limit = 50, skip = 0 } = req.query;

  let where = "WHERE business_id = 'biz-silver-sands'";
  const params: unknown[] = [];

  if (event_key) { where += " AND event_key LIKE ?"; params.push(`%${event_key}%`); }
  if (target_id) { where += " AND target_id = ?"; params.push(target_id); }
  if (user_id)   { where += " AND (actor_user_id = ? OR related_user_id = ?)"; params.push(user_id, user_id); }

  ok(res, db.prepare(
    `SELECT * FROM workforce_audit_events ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, +limit, +skip));
});

// ── Invitations ───────────────────────────────────────────────────────────────

/** GET /workforce/invitations */
router.get("/invitations", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare(`
    SELECT eli.*,
      ep.legal_first_name || ' ' || ep.legal_last_name AS employee_name,
      ep.job_title
    FROM employee_link_invitations eli
    JOIN employee_profiles ep ON ep.id = eli.employee_profile_id
    WHERE eli.business_id = 'biz-silver-sands'
    ORDER BY eli.created_at DESC
    LIMIT 100
  `).all());
});

export default router;
