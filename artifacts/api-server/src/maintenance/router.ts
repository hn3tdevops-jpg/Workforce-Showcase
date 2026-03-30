import { Router, type Request, type Response } from "express";
import { getDb } from "../hospitable/db.js";

const router = Router();

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function notFound(res: Response, msg = "Not found") { res.status(404).json({ detail: msg }); }
function bad(res: Response, msg: string) { res.status(400).json({ detail: msg }); }

const MAINT_SELECT = `
  SELECT mi.*,
    hr.room_number, hr.room_type,
    ep.legal_first_name || ' ' || ep.legal_last_name AS assignee_ep_name,
    ep.job_title AS assignee_ep_title
  FROM maintenance_issues mi
  LEFT JOIN hk_rooms hr ON hr.id = mi.room_id
  LEFT JOIN employee_profiles ep ON ep.id = mi.assignee_ep_id
`;

/** GET /maintenance */
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const { status, severity, room_id } = req.query;
  let where = "WHERE mi.location_id = 'loc-001'";
  const params: unknown[] = [];
  if (status)   { where += " AND mi.status = ?";   params.push(status); }
  if (severity) { where += " AND mi.severity = ?"; params.push(severity); }
  if (room_id)  { where += " AND mi.room_id = ?";  params.push(room_id); }
  ok(res, db.prepare(`${MAINT_SELECT} ${where} ORDER BY mi.reported_at DESC`).all(...params));
});

/** GET /maintenance/summary */
router.get("/summary", (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT status, COUNT(*) as count FROM maintenance_issues
    WHERE location_id = 'loc-001' GROUP BY status
  `).all() as { status: string; count: number }[];
  const by_status: Record<string, number> = {};
  for (const r of rows) by_status[r.status] = r.count;
  const total = (db.prepare("SELECT COUNT(*) as n FROM maintenance_issues WHERE location_id = 'loc-001'").get() as { n: number }).n;
  ok(res, { total, by_status });
});

/** GET /maintenance/:id */
router.get("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(`${MAINT_SELECT} WHERE mi.id = ?`).get(req.params.id);
  if (!row) return notFound(res);
  ok(res, row);
});

/** POST /maintenance */
router.post("/", (req: Request, res: Response) => {
  const { title, description, issue_type = "general", severity = "normal", room_id, assignee_ep_id } = req.body;
  if (!title) return bad(res, "title required");
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO maintenance_issues
      (location_id, room_id, issue_type, title, description, severity, status, assignee_ep_id)
    VALUES ('loc-001', ?, ?, ?, ?, ?, 'open', ?)
  `).run(room_id ?? null, issue_type, title, description ?? null, severity, assignee_ep_id ?? null);
  const id = result.lastInsertRowid;
  notifyMaintenance(db, id as number, title);
  ok(res, db.prepare(`${MAINT_SELECT} WHERE mi.id = ?`).get(id), 201);
});

/** PATCH /maintenance/:id */
router.patch("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const { title, description, severity, issue_type, assignee_ep_id } = req.body;
  db.prepare(`
    UPDATE maintenance_issues SET
      title          = COALESCE(?, title),
      description    = COALESCE(?, description),
      severity       = COALESCE(?, severity),
      issue_type     = COALESCE(?, issue_type),
      assignee_ep_id = COALESCE(?, assignee_ep_id),
      updated_at     = datetime('now')
    WHERE id = ?
  `).run(title ?? null, description ?? null, severity ?? null, issue_type ?? null, assignee_ep_id ?? null, req.params.id);
  const row = db.prepare(`${MAINT_SELECT} WHERE mi.id = ?`).get(req.params.id);
  if (!row) return notFound(res);
  ok(res, row);
});

/** POST /maintenance/:id/start */
router.post("/:id/start", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare("SELECT id, status FROM maintenance_issues WHERE id = ?").get(req.params.id) as any;
  if (!row) return notFound(res);
  if (row.status !== "open") return bad(res, `Cannot start from status '${row.status}'`);
  db.prepare("UPDATE maintenance_issues SET status='in_progress', updated_at=datetime('now') WHERE id=?").run(req.params.id);
  ok(res, db.prepare(`${MAINT_SELECT} WHERE mi.id = ?`).get(req.params.id));
});

/** POST /maintenance/:id/resolve */
router.post("/:id/resolve", (req: Request, res: Response) => {
  const { resolution_notes } = req.body ?? {};
  const db = getDb();
  const row = db.prepare("SELECT id, status FROM maintenance_issues WHERE id = ?").get(req.params.id) as any;
  if (!row) return notFound(res);
  db.prepare(`
    UPDATE maintenance_issues SET
      status = 'resolved', resolved_at = datetime('now'),
      description = COALESCE(?, description),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(resolution_notes ?? null, req.params.id);
  // Update room maintenance_status to 'ok' if room attached
  const mi = db.prepare("SELECT room_id FROM maintenance_issues WHERE id = ?").get(req.params.id) as any;
  if (mi?.room_id) {
    db.prepare("UPDATE hk_rooms SET maintenance_status='ok', updated_at=datetime('now') WHERE id=?").run(mi.room_id);
  }
  ok(res, db.prepare(`${MAINT_SELECT} WHERE mi.id = ?`).get(req.params.id));
});

/** POST /maintenance/:id/close */
router.post("/:id/close", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("UPDATE maintenance_issues SET status='closed', updated_at=datetime('now') WHERE id=?").run(req.params.id);
  const row = db.prepare(`${MAINT_SELECT} WHERE mi.id = ?`).get(req.params.id);
  if (!row) return notFound(res);
  ok(res, row);
});

/** GET /maintenance/export.csv */
router.get("/export.csv", (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(`${MAINT_SELECT} WHERE mi.location_id = 'loc-001' ORDER BY mi.reported_at DESC`).all() as any[];
  const header = "id,title,issue_type,severity,status,room_number,assignee,reported_at,resolved_at\n";
  const csv = rows.map(r =>
    [r.id, `"${(r.title ?? "").replace(/"/g, '""')}"`, r.issue_type, r.severity, r.status,
     r.room_number ?? "", `"${(r.assignee_ep_name ?? "").replace(/"/g, '""')}"`,
     r.reported_at ?? "", r.resolved_at ?? ""].join(",")
  ).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=maintenance.csv");
  res.send(header + csv);
});

/** POST /maintenance/seed */
router.post("/seed", (req: Request, res: Response) => {
  const db = getDb();
  const existing = (db.prepare("SELECT COUNT(*) as n FROM maintenance_issues WHERE location_id='loc-001'").get() as { n: number }).n;
  if (existing > 0) { ok(res, { ok: true, seeded: 0, message: "Already seeded" }); return; }
  const rooms = db.prepare("SELECT id FROM hk_rooms LIMIT 8").all() as { id: number }[];
  const eps   = db.prepare("SELECT id FROM employee_profiles LIMIT 3").all() as { id: string }[];
  const SEEDS = [
    { title: "Bathroom faucet dripping",     type: "plumbing",     severity: "normal",   status: "open",        room_idx: 0 },
    { title: "AC unit not cooling properly",  type: "hvac",         severity: "high",     status: "in_progress", room_idx: 1 },
    { title: "Room 104 TV remote missing",    type: "amenity",      severity: "low",      status: "open",        room_idx: 2 },
    { title: "Hallway light bulb out – B2F1", type: "electrical",   severity: "normal",   status: "resolved",    room_idx: 3 },
    { title: "Window seal broken – Room 207", type: "structural",   severity: "high",     status: "open",        room_idx: 4 },
    { title: "Mini fridge not cooling",       type: "amenity",      severity: "normal",   status: "resolved",    room_idx: 5 },
  ];
  let seeded = 0;
  for (const s of SEEDS) {
    const room = rooms[s.room_idx];
    const ep   = eps[seeded % (eps.length || 1)];
    const result = db.prepare(`
      INSERT INTO maintenance_issues (location_id, room_id, issue_type, title, severity, status, assignee_ep_id, reported_at, resolved_at)
      VALUES ('loc-001', ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'), ?)
    `).run(
      room?.id ?? null, s.type, s.title, s.severity, s.status,
      ep?.id ?? null,
      seeded + 1,
      s.status === "resolved" ? new Date().toISOString() : null,
    );
    if (s.room_idx < rooms.length && room) {
      db.prepare("UPDATE hk_rooms SET maintenance_status = ? WHERE id = ?")
        .run(s.status === "resolved" ? "ok" : "issue", room.id);
    }
    seeded++;
  }
  ok(res, { ok: true, seeded });
});

function notifyMaintenance(db: ReturnType<typeof getDb>, issueId: number, title: string) {
  try {
    db.prepare(`
      INSERT INTO notifications (id, type, title, body, link, created_at)
      VALUES (?, 'maintenance', 'New Maintenance Issue', ?, ?, datetime('now'))
    `).run(
      Math.random().toString(36).slice(2),
      `Issue reported: ${title}`,
      `/app/maintenance`,
    );
  } catch { /* notifications table may not exist yet */ }
}

export default router;
