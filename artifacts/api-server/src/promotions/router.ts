import { Router, type Request, type Response } from "express";
import { getDb } from "../hospitable/db.js";

const router = Router();

function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json(data);
}
function notFound(res: Response, msg = "Not found") {
  res.status(404).json({ detail: msg });
}
function badRequest(res: Response, msg: string) {
  res.status(400).json({ detail: msg });
}
function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function now(): string {
  return new Date().toISOString();
}

// ── Career Tiers ─────────────────────────────────────────────────────────────

router.get("/tiers", (_req: Request, res: Response) => {
  const db = getDb();
  const tiers = db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM promotion_criteria c WHERE c.tier_id = t.id) AS criteria_count,
      (SELECT COUNT(*) FROM staff_promotions p WHERE p.to_tier_id = t.id) AS promotion_count
    FROM promotion_tiers t
    ORDER BY t.track_name, t.tier_level
  `).all();
  ok(res, tiers);
});

router.post("/tiers", (req: Request, res: Response) => {
  const { track_name, tier_name, tier_level, role_type, description, color } = req.body;
  if (!track_name || !tier_name || !tier_level) return badRequest(res, "track_name, tier_name, tier_level required");
  const db = getDb();
  const id = uid();
  db.prepare(`
    INSERT INTO promotion_tiers (id, track_name, tier_name, tier_level, role_type, description, color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, track_name, tier_name, +tier_level, role_type ?? null, description ?? null, color ?? "blue");
  ok(res, db.prepare("SELECT * FROM promotion_tiers WHERE id = ?").get(id), 201);
});

router.patch("/tiers/:id", (req: Request, res: Response) => {
  const db = getDb();
  const tier = db.prepare("SELECT * FROM promotion_tiers WHERE id = ?").get(req.params.id) as any;
  if (!tier) return notFound(res);
  const { track_name, tier_name, tier_level, role_type, description, color } = req.body;
  db.prepare(`
    UPDATE promotion_tiers SET
      track_name  = ?,
      tier_name   = ?,
      tier_level  = ?,
      role_type   = ?,
      description = ?,
      color       = ?
    WHERE id = ?
  `).run(
    track_name  ?? tier.track_name,
    tier_name   ?? tier.tier_name,
    tier_level  != null ? +tier_level : tier.tier_level,
    role_type   ?? tier.role_type,
    description ?? tier.description,
    color       ?? tier.color,
    req.params.id,
  );
  ok(res, db.prepare("SELECT * FROM promotion_tiers WHERE id = ?").get(req.params.id));
});

router.delete("/tiers/:id", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("DELETE FROM promotion_tiers WHERE id = ?").run(req.params.id);
  ok(res, { ok: true });
});

// ── Criteria ──────────────────────────────────────────────────────────────────

router.get("/tiers/:id/criteria", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare("SELECT * FROM promotion_criteria WHERE tier_id = ? ORDER BY created_at").all(req.params.id));
});

router.post("/tiers/:id/criteria", (req: Request, res: Response) => {
  const { criterion_type, target_value, label } = req.body;
  if (!label) return badRequest(res, "label required");
  const db = getDb();
  const tier = db.prepare("SELECT id FROM promotion_tiers WHERE id = ?").get(req.params.id);
  if (!tier) return notFound(res);
  const id = uid();
  db.prepare(`
    INSERT INTO promotion_criteria (id, tier_id, criterion_type, target_value, label)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.params.id, criterion_type ?? "MANAGER_APPROVAL", target_value ?? 1, label);
  ok(res, db.prepare("SELECT * FROM promotion_criteria WHERE id = ?").get(id), 201);
});

router.delete("/criteria/:id", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("DELETE FROM promotion_criteria WHERE id = ?").run(req.params.id);
  ok(res, { ok: true });
});

// ── Promotions Log ────────────────────────────────────────────────────────────

router.get("/history", (req: Request, res: Response) => {
  const db = getDb();
  const { staff_id, limit = 50, skip = 0 } = req.query;
  let sql = `
    SELECT p.*,
      ft.tier_name AS from_tier_name, ft.track_name AS from_track_name,
      tt.tier_name AS to_tier_name,   tt.track_name AS to_track_name,
      ls.first_name || ' ' || ls.last_name AS staff_name,
      ls.job_title
    FROM staff_promotions p
    LEFT JOIN promotion_tiers ft ON ft.id = p.from_tier_id
    LEFT JOIN promotion_tiers tt ON tt.id = p.to_tier_id
    LEFT JOIN local_staff ls      ON ls.id = p.staff_id
  `;
  const params: unknown[] = [];
  if (staff_id) { sql += " WHERE p.staff_id = ?"; params.push(staff_id); }
  sql += " ORDER BY p.promoted_at DESC LIMIT ? OFFSET ?";
  params.push(+limit, +skip);
  ok(res, db.prepare(sql).all(...params));
});

router.post("/history", (req: Request, res: Response) => {
  const { staff_id, to_tier_id, from_tier_id, promoted_by, notes } = req.body;
  if (!staff_id || !to_tier_id || !promoted_by) return badRequest(res, "staff_id, to_tier_id, promoted_by required");
  const db = getDb();
  const id = uid();
  db.prepare(`
    INSERT INTO staff_promotions (id, staff_id, from_tier_id, to_tier_id, promoted_by, notes, promoted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, staff_id, from_tier_id ?? null, to_tier_id, promoted_by, notes ?? null, now());
  ok(res, db.prepare(`
    SELECT p.*,
      ft.tier_name AS from_tier_name, tt.tier_name AS to_tier_name,
      ls.first_name || ' ' || ls.last_name AS staff_name
    FROM staff_promotions p
    LEFT JOIN promotion_tiers ft ON ft.id = p.from_tier_id
    LEFT JOIN promotion_tiers tt ON tt.id = p.to_tier_id
    LEFT JOIN local_staff ls      ON ls.id = p.staff_id
    WHERE p.id = ?
  `).get(id), 201);
});

// ── Staff Progress ────────────────────────────────────────────────────────────

router.get("/staff-progress", (_req: Request, res: Response) => {
  const db = getDb();

  const staff = db.prepare(`
    SELECT id, first_name, last_name, job_title, role, is_active
    FROM local_staff WHERE is_active = 1 ORDER BY first_name, last_name
  `).all() as any[];

  const tiers = db.prepare("SELECT * FROM promotion_tiers ORDER BY track_name, tier_level").all() as any[];
  const promotions = db.prepare(`
    SELECT staff_id, to_tier_id, promoted_at FROM staff_promotions ORDER BY promoted_at DESC
  `).all() as any[];

  // Get latest tier per staff member
  const latestTier: Record<string, string> = {};
  const promotedAt: Record<string, string> = {};
  for (const p of promotions) {
    if (!latestTier[p.staff_id]) {
      latestTier[p.staff_id] = p.to_tier_id;
      promotedAt[p.staff_id] = p.promoted_at;
    }
  }

  const tierMap = new Map(tiers.map(t => [t.id, t]));

  const result = staff.map(s => {
    const currentTierId = latestTier[s.id];
    const currentTier   = currentTierId ? tierMap.get(currentTierId) : null;
    let nextTier = null;
    if (currentTier) {
      nextTier = tiers.find(t => t.track_name === currentTier.track_name && t.tier_level === currentTier.tier_level + 1) ?? null;
    }
    return {
      ...s,
      current_tier:    currentTier ?? null,
      next_tier:       nextTier,
      last_promoted:   promotedAt[s.id] ?? null,
      promotion_count: promotions.filter(p => p.staff_id === s.id).length,
    };
  });

  ok(res, result);
});

// ── Recognition Events ────────────────────────────────────────────────────────

router.get("/recognition", (req: Request, res: Response) => {
  const db = getDb();
  const { staff_id, limit = 50, skip = 0 } = req.query;
  let sql = `
    SELECT r.*,
      ls.first_name || ' ' || ls.last_name AS staff_name,
      ls.job_title
    FROM recognition_events r
    LEFT JOIN local_staff ls ON ls.id = r.staff_id
  `;
  const params: unknown[] = [];
  if (staff_id) { sql += " WHERE r.staff_id = ?"; params.push(staff_id); }
  sql += " ORDER BY r.event_date DESC LIMIT ? OFFSET ?";
  params.push(+limit, +skip);
  ok(res, db.prepare(sql).all(...params));
});

router.post("/recognition", (req: Request, res: Response) => {
  const { staff_id, event_type, title, notes, given_by } = req.body;
  if (!staff_id || !title || !given_by) return badRequest(res, "staff_id, title, given_by required");
  const db = getDb();
  const id = uid();
  db.prepare(`
    INSERT INTO recognition_events (id, staff_id, event_type, title, notes, given_by, event_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, staff_id, event_type ?? "KUDOS", title, notes ?? null, given_by, now());
  ok(res, db.prepare(`
    SELECT r.*, ls.first_name || ' ' || ls.last_name AS staff_name
    FROM recognition_events r LEFT JOIN local_staff ls ON ls.id = r.staff_id WHERE r.id = ?
  `).get(id), 201);
});

router.delete("/recognition/:id", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("DELETE FROM recognition_events WHERE id = ?").run(req.params.id);
  ok(res, { ok: true });
});

// ── Seed starter tiers (idempotent) ──────────────────────────────────────────

export function seedPromotionTiers(): void {
  const db = getDb();
  const existing = (db.prepare("SELECT COUNT(*) as cnt FROM promotion_tiers").get() as any).cnt;
  if (existing > 0) return;

  const tracks = [
    {
      track: "Housekeeping",
      color: "emerald",
      tiers: [
        { name: "Housekeeper I",    level: 1, role: "Housekeeper",          desc: "Entry-level housekeeping. Responsible for standard room cleaning duties." },
        { name: "Housekeeper II",   level: 2, role: "Housekeeper",          desc: "Intermediate level. Handles deep cleaning and trains new hires." },
        { name: "Lead Housekeeper", level: 3, role: "Lead Housekeeper",     desc: "Leads a team section, inspects rooms, reports supply needs." },
        { name: "HK Supervisor",    level: 4, role: "Housekeeping Supervisor", desc: "Manages the full housekeeping team, scheduling, and quality control." },
      ],
    },
    {
      track: "Maintenance",
      color: "amber",
      tiers: [
        { name: "Maintenance Tech I",   level: 1, role: "Maintenance",           desc: "Basic repairs and preventive maintenance tasks." },
        { name: "Maintenance Tech II",  level: 2, role: "Maintenance",           desc: "Handles complex repairs, HVAC basics, and pool maintenance." },
        { name: "Maintenance Lead",     level: 3, role: "Lead Maintenance",      desc: "Coordinates the maintenance schedule and oversees urgent work orders." },
        { name: "Chief of Maintenance", level: 4, role: "Maintenance Supervisor",desc: "Full facility oversight, vendor management, budget input." },
      ],
    },
    {
      track: "Front Desk",
      color: "blue",
      tiers: [
        { name: "Guest Services Rep I",  level: 1, role: "Front Desk",           desc: "Handles check-in/check-out and basic guest requests." },
        { name: "Guest Services Rep II", level: 2, role: "Front Desk",           desc: "Manages escalations, upsells, and multi-tasking during peak hours." },
        { name: "Front Desk Lead",       level: 3, role: "Lead Front Desk",      desc: "Leads shift handoffs and coaches junior reps." },
        { name: "Front Office Manager",  level: 4, role: "Front Desk Manager",   desc: "Full front desk operations, night audit oversight, guest satisfaction." },
      ],
    },
  ];

  const criteriaByLevel: Record<number, Array<{ type: string; value: number; label: string }>> = {
    1: [],
    2: [
      { type: "TASKS_COMPLETED", value: 100, label: "Complete 100 assigned tasks" },
      { type: "DAYS_IN_ROLE",    value: 90,  label: "90 days in current role" },
      { type: "MANAGER_APPROVAL",value: 1,   label: "Manager recommendation" },
    ],
    3: [
      { type: "TASKS_COMPLETED", value: 300, label: "Complete 300 assigned tasks" },
      { type: "DAYS_IN_ROLE",    value: 180, label: "180 days in current role" },
      { type: "MANAGER_APPROVAL",value: 1,   label: "Manager approval" },
      { type: "TRAINING",        value: 1,   label: "Complete leadership training module" },
    ],
    4: [
      { type: "TASKS_COMPLETED",  value: 500, label: "Complete 500 assigned tasks" },
      { type: "DAYS_IN_ROLE",     value: 365, label: "365 days in current role" },
      { type: "MANAGER_APPROVAL", value: 1,   label: "Owner/GM approval" },
      { type: "TRAINING",         value: 2,   label: "Complete 2 management training modules" },
    ],
  };

  const insertTier = db.prepare(`
    INSERT OR IGNORE INTO promotion_tiers (id, track_name, tier_name, tier_level, role_type, description, color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCrit = db.prepare(`
    INSERT INTO promotion_criteria (id, tier_id, criterion_type, target_value, label) VALUES (?, ?, ?, ?, ?)
  `);

  for (const track of tracks) {
    for (const tier of track.tiers) {
      const tierId = `tier-${track.track.toLowerCase().replace(/\s+/g, "-")}-${tier.level}`;
      insertTier.run(tierId, track.track, tier.name, tier.level, tier.role, tier.desc, track.color);
      for (const c of criteriaByLevel[tier.level] ?? []) {
        insertCrit.run(uid(), tierId, c.type, c.value, c.label);
      }
    }
  }
}

export default router;
