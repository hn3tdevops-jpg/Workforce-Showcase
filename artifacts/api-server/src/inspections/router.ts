import { Router, type Request, type Response } from "express";
import { getDb } from "../hospitable/db.js";

const router = Router();

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function notFound(res: Response, msg = "Not found") { res.status(404).json({ detail: msg }); }
function bad(res: Response, msg: string) { res.status(400).json({ detail: msg }); }

const INSP_SELECT = `
  SELECT
    ri.*,
    hr.room_number        AS room_number,
    hr.room_type          AS room_type_name,
    hr.housekeeping_status AS room_hk_status,
    ep.legal_first_name || ' ' || ep.legal_last_name AS inspector_name,
    ep.job_title  AS inspector_title
  FROM room_inspections ri
  LEFT JOIN hk_rooms hr ON hr.id = ri.room_id
  LEFT JOIN employee_profiles ep ON ep.id = ri.inspector_ep_id
`;

/** GET /inspections/rooms — list rooms for selector */
router.get("/rooms", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare(`
    SELECT id, room_number AS num, room_type, housekeeping_status
    FROM hk_rooms
    WHERE location_id = 'loc-001'
    ORDER BY room_number
  `).all());
});

/** GET /inspections */
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const status = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;
  const location_id = Array.isArray(req.query.location_id) ? req.query.location_id[0] : req.query.location_id;
  const room_id = Array.isArray(req.query.room_id) ? req.query.room_id[0] : req.query.room_id;
  const limit = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit ?? "100");
  const skip = Number(Array.isArray(req.query.skip) ? req.query.skip[0] : req.query.skip ?? "0");


  let where = "WHERE ri.business_id = 'biz-silver-sands'";
  const params: unknown[] = [];
  if (status)      { where += " AND ri.status = ?";      params.push(status); }
  if (location_id) { where += " AND ri.location_id = ?"; params.push(location_id); }
  if (room_id)     { where += " AND ri.room_id = ?";     params.push(room_id); }

  ok(res, db.prepare(`${INSP_SELECT} ${where} ORDER BY ri.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, +limit, +skip));
});

/** GET /inspections/summary */
router.get("/summary", (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM room_inspections
    WHERE business_id = 'biz-silver-sands'
    GROUP BY status
  `).all() as { status: string; count: number }[];

  const summary: Record<string, number> = {};
  for (const r of rows) summary[r.status] = r.count;

  const total = db.prepare("SELECT COUNT(*) as n FROM room_inspections WHERE business_id = 'biz-silver-sands'").get() as { n: number };
  const avg = db.prepare("SELECT AVG(overall_score) as a FROM room_inspections WHERE business_id = 'biz-silver-sands' AND overall_score IS NOT NULL").get() as { a: number | null };
  const passRate = db.prepare("SELECT ROUND(AVG(CASE WHEN passed = 1 THEN 100.0 ELSE 0 END), 1) as r FROM room_inspections WHERE business_id = 'biz-silver-sands' AND passed IS NOT NULL").get() as { r: number | null };

  ok(res, { total: total.n, by_status: summary, avg_score: avg.a, pass_rate: passRate.r });
});

/** GET /inspections/export.csv */
router.get("/export.csv", (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(`${INSP_SELECT} WHERE ri.business_id = 'biz-silver-sands' ORDER BY ri.created_at DESC`).all() as any[];
  const header = "id,room_number,status,overall_score,passed,inspector,scheduled_for,conducted_at\n";
  const csv = rows.map(r =>
    [r.id, r.room_number ?? "", r.status, r.overall_score ?? "", r.passed != null ? (r.passed ? "pass" : "fail") : "",
     `"${(r.inspector_name ?? "").replace(/"/g, '""')}"`,
     r.scheduled_for ?? "", r.conducted_at ?? ""].join(",")
  ).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=inspections.csv");
  res.send(header + csv);
});

/** GET /inspections/:id */
router.get("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(`${INSP_SELECT} WHERE ri.id = ?`).get(req.params.id);
  if (!row) return notFound(res);
  ok(res, row);
});

/** POST /inspections — create (schedule) an inspection */
router.post("/", (req: Request, res: Response) => {
  const {
    location_id = "loc-001",
    room_id, inspector_ep_id, inspector_user_id,
    scheduled_for, notes, actor_user_id,
  } = req.body;

  const db = getDb();
  const id = uid();
  db.prepare(`
    INSERT INTO room_inspections
      (id, location_id, room_id, inspector_ep_id, inspector_user_id,
       status, notes, scheduled_for, business_id)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, 'biz-silver-sands')
  `).run(id, location_id, room_id ?? null, inspector_ep_id ?? null, inspector_user_id ?? null, notes ?? null, scheduled_for ?? null);

  ok(res, db.prepare(`${INSP_SELECT} WHERE ri.id = ?`).get(id), 201);
});

/** PATCH /inspections/:id — update inspector, notes, schedule */
router.patch("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const { inspector_ep_id, notes, scheduled_for, items_json } = req.body;
  db.prepare(`
    UPDATE room_inspections SET
      inspector_ep_id = COALESCE(?, inspector_ep_id),
      notes           = COALESCE(?, notes),
      scheduled_for   = COALESCE(?, scheduled_for),
      items_json      = COALESCE(?, items_json),
      updated_at      = datetime('now')
    WHERE id = ?
  `).run(inspector_ep_id ?? null, notes ?? null, scheduled_for ?? null, items_json ? JSON.stringify(items_json) : null, req.params.id);
  const row = db.prepare(`${INSP_SELECT} WHERE ri.id = ?`).get(req.params.id);
  if (!row) return notFound(res);
  ok(res, row);
});

/** POST /inspections/:id/start */
router.post("/:id/start", (req: Request, res: Response) => {
  const db = getDb();
  const insp = db.prepare("SELECT id, status FROM room_inspections WHERE id = ?").get(req.params.id) as any;
  if (!insp) return notFound(res);
  if (insp.status !== "pending") return bad(res, `Cannot start from status '${insp.status}'`);
  db.prepare("UPDATE room_inspections SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  ok(res, db.prepare(`${INSP_SELECT} WHERE ri.id = ?`).get(req.params.id));
});

/** POST /inspections/:id/submit — submit inspection result */
router.post("/:id/submit", (req: Request, res: Response) => {
  const { overall_score, passed, notes, items_json } = req.body;
  if (overall_score === undefined || passed === undefined) return bad(res, "overall_score and passed required");

  const db = getDb();
  const insp = db.prepare("SELECT id, status FROM room_inspections WHERE id = ?").get(req.params.id) as any;
  if (!insp) return notFound(res);
  if (!["pending", "in_progress"].includes(insp.status)) return bad(res, `Cannot submit from status '${insp.status}'`);

  const finalStatus = passed ? "passed" : "failed";
  db.prepare(`
    UPDATE room_inspections SET
      status        = ?,
      overall_score = ?,
      passed        = ?,
      notes         = COALESCE(?, notes),
      items_json    = COALESCE(?, items_json),
      conducted_at  = datetime('now'),
      updated_at    = datetime('now')
    WHERE id = ?
  `).run(finalStatus, +overall_score, passed ? 1 : 0, notes ?? null, items_json ? JSON.stringify(items_json) : null, req.params.id);

  // Update room hk_status to 'inspected' if passed
  const insp2 = db.prepare("SELECT * FROM room_inspections WHERE id = ?").get(req.params.id) as any;
  if (passed && insp2?.room_id) {
    db.prepare("UPDATE hk_rooms SET hk_status = 'inspected', updated_at = datetime('now') WHERE id = ?")
      .run(insp2.room_id);
  }

  ok(res, db.prepare(`${INSP_SELECT} WHERE ri.id = ?`).get(req.params.id));
});

/** POST /inspections/:id/approve */
router.post("/:id/approve", (req: Request, res: Response) => {
  const { approved_by_ep_id } = req.body;
  const db = getDb();
  const insp = db.prepare("SELECT id, status FROM room_inspections WHERE id = ?").get(req.params.id) as any;
  if (!insp) return notFound(res);
  if (insp.status !== "passed") return bad(res, "Only passed inspections can be approved");

  db.prepare(`
    UPDATE room_inspections SET
      status = 'approved', approved_by_ep_id = ?, approved_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(approved_by_ep_id ?? null, req.params.id);
  ok(res, db.prepare(`${INSP_SELECT} WHERE ri.id = ?`).get(req.params.id));
});

/** DELETE /inspections/:id — cancel */
router.delete("/:id", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("UPDATE room_inspections SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?")
    .run(req.params.id);
  ok(res, { ok: true });
});

/** POST /inspections/seed — seed sample inspections (idempotent) */
router.post("/seed", (req: Request, res: Response) => {
  const db = getDb();
  const existing = (db.prepare("SELECT COUNT(*) as n FROM room_inspections WHERE business_id = 'biz-silver-sands'").get() as { n: number }).n;
  if (existing > 0) { ok(res, { ok: true, seeded: 0, message: "Already seeded" }); return; }

  const rooms = db.prepare("SELECT id, room_number AS num FROM hk_rooms LIMIT 10").all() as { id: number; num: string }[];
  const eps   = db.prepare("SELECT id FROM employee_profiles LIMIT 3").all() as { id: string }[];
  if (rooms.length === 0 || eps.length === 0) { ok(res, { ok: true, seeded: 0, message: "No rooms or employees to seed with" }); return; }

  const SAMPLE_ITEMS = JSON.stringify([
    { label: "Floors cleaned",      score: null, passed: null },
    { label: "Bathroom sanitized",  score: null, passed: null },
    { label: "Linens replaced",     score: null, passed: null },
    { label: "Mini-bar restocked",  score: null, passed: null },
    { label: "AC/Heating functional", score: null, passed: null },
  ]);

  const SAMPLE_ITEMS_DONE = JSON.stringify([
    { label: "Floors cleaned",        score: 9,  passed: true },
    { label: "Bathroom sanitized",    score: 10, passed: true },
    { label: "Linens replaced",       score: 9,  passed: true },
    { label: "Mini-bar restocked",    score: 8,  passed: true },
    { label: "AC/Heating functional", score: 10, passed: true },
  ]);

  const SAMPLE_ITEMS_FAIL = JSON.stringify([
    { label: "Floors cleaned",        score: 4,  passed: false },
    { label: "Bathroom sanitized",    score: 9,  passed: true },
    { label: "Linens replaced",       score: 3,  passed: false },
    { label: "Mini-bar restocked",    score: 8,  passed: true },
    { label: "AC/Heating functional", score: 10, passed: true },
  ]);

  const seeds = [
    { room: rooms[0], ep: eps[0], status: "pending",     score: null,  passed: null,  items: SAMPLE_ITEMS,      scheduled: new Date(Date.now() + 86400000).toISOString().slice(0,10) },
    { room: rooms[1], ep: eps[1], status: "in_progress", score: null,  passed: null,  items: SAMPLE_ITEMS,      scheduled: new Date().toISOString().slice(0,10) },
    { room: rooms[2], ep: eps[0], status: "passed",      score: 92,    passed: 1,     items: SAMPLE_ITEMS_DONE, scheduled: null },
    { room: rooms[3], ep: eps[2] ?? eps[0], status: "failed",  score: 54, passed: 0, items: SAMPLE_ITEMS_FAIL, scheduled: null },
    { room: rooms[4], ep: eps[1], status: "approved",    score: 95,    passed: 1,     items: SAMPLE_ITEMS_DONE, scheduled: null },
  ];

  let seeded = 0;
  for (const s of seeds) {
    db.prepare(`
      INSERT INTO room_inspections
        (id, location_id, room_id, inspector_ep_id, status, overall_score, passed,
         items_json, scheduled_for, conducted_at, business_id)
      VALUES (?, 'loc-001', ?, ?, ?, ?, ?, ?, ?, ?, 'biz-silver-sands')
    `).run(
      uid(), s.room.id, s.ep.id, s.status, s.score, s.passed,
      s.items,
      s.scheduled,
      s.status === "pending" || s.status === "in_progress" ? null : new Date().toISOString(),
    );
    seeded++;
  }

  ok(res, { ok: true, seeded });
});

export default router;
