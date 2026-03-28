import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { getDb } from "../hospitable/db.js";

const router = Router();

function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function notFound(res: Response, msg = "Not found") { res.status(404).json({ detail: msg }); }
function badRequest(res: Response, msg: string) { res.status(400).json({ detail: msg }); }

// ── Helper: load a shift with its assignees ────────────────────────────────

function loadShift(db: ReturnType<typeof getDb>, shiftId: string) {
  const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(shiftId) as Record<string, unknown> | undefined;
  if (!shift) return null;
  const assignees = db.prepare(
    "SELECT user_id FROM shift_assignees WHERE shift_id = ? ORDER BY assigned_at"
  ).all(shiftId) as Array<{ user_id: string }>;
  return { ...shift, assignee_ids: assignees.map(a => a.user_id) };
}

function recalcStatus(db: ReturnType<typeof getDb>, shiftId: string) {
  const shift = db.prepare("SELECT capacity FROM shifts WHERE id = ?").get(shiftId) as { capacity: number } | undefined;
  if (!shift) return;
  const count = (db.prepare("SELECT COUNT(*) as n FROM shift_assignees WHERE shift_id = ?").get(shiftId) as { n: number }).n;
  let status = "open";
  if (count >= shift.capacity) status = "filled";
  else if (count > 0) status = "partial";
  db.prepare("UPDATE shifts SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, shiftId);
}

// ── Shifts ────────────────────────────────────────────────────────────────────

router.get("/shifts/", (req: Request, res: Response) => {
  const db = getDb();
  const { location_id, week_start } = req.query as Record<string, string>;

  let sql = "SELECT * FROM shifts WHERE 1=1";
  const vals: unknown[] = [];

  if (location_id) { sql += " AND location_id = ?"; vals.push(location_id); }
  if (week_start) {
    const start = week_start;
    const end = new Date(week_start);
    end.setDate(end.getDate() + 7);
    sql += " AND date >= ? AND date < ?";
    vals.push(start, end.toISOString().slice(0, 10));
  }
  sql += " ORDER BY date, start_time";

  const shifts = db.prepare(sql).all(...vals) as Array<Record<string, unknown>>;
  const result = shifts.map(s => {
    const assignees = db.prepare(
      "SELECT user_id FROM shift_assignees WHERE shift_id = ? ORDER BY assigned_at"
    ).all(s.id as string) as Array<{ user_id: string }>;
    return { ...s, assignee_ids: assignees.map(a => a.user_id) };
  });
  ok(res, result);
});

router.post("/shifts/", (req: Request, res: Response) => {
  const db = getDb();
  const { location_id, title, role, date, start_time, end_time, capacity, notes } =
    req.body as Partial<Record<string, unknown>>;
  if (!location_id || !title || !role || !date || !start_time || !end_time) {
    return badRequest(res, "location_id, title, role, date, start_time, end_time required");
  }
  const id = `shift-${randomUUID().slice(0, 8)}`;
  db.prepare(
    "INSERT INTO shifts (id, location_id, title, role, date, start_time, end_time, capacity, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)"
  ).run(id, location_id, title, role, date, start_time, end_time, capacity ?? 1, notes ?? null);
  ok(res, loadShift(db, id), 201);
});

router.patch("/shifts/:shiftId", (req: Request, res: Response) => {
  const db = getDb();
  const fields = ["title", "role", "date", "start_time", "end_time", "capacity", "status", "notes"] as const;
  const body = req.body as Record<string, unknown>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); }
  }
  if (!sets.length) return badRequest(res, "No fields to update");
  sets.push("updated_at = datetime('now')");
  vals.push(req.params.shiftId);
  const result = db.prepare(`UPDATE shifts SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  if (result.changes === 0) return notFound(res);
  if (body.capacity !== undefined) recalcStatus(db, req.params.shiftId);
  ok(res, loadShift(db, req.params.shiftId));
});

router.delete("/shifts/:shiftId", (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare(
    "UPDATE shifts SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?"
  ).run(req.params.shiftId);
  if (result.changes === 0) return notFound(res);
  ok(res, { detail: "Shift cancelled" });
});

// ── Assignees ─────────────────────────────────────────────────────────────────

router.post("/shifts/:shiftId/assignees", (req: Request, res: Response) => {
  const db = getDb();
  const { user_id } = req.body as { user_id: string };
  if (!user_id) return badRequest(res, "user_id required");
  const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(req.params.shiftId);
  if (!shift) return notFound(res, "Shift not found");
  try {
    db.prepare("INSERT INTO shift_assignees (shift_id, user_id) VALUES (?, ?)").run(req.params.shiftId, user_id);
  } catch {
    // already assigned — silently ignore duplicate
  }
  recalcStatus(db, req.params.shiftId);
  ok(res, loadShift(db, req.params.shiftId));
});

router.delete("/shifts/:shiftId/assignees/:userId", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("DELETE FROM shift_assignees WHERE shift_id = ? AND user_id = ?").run(req.params.shiftId, req.params.userId);
  recalcStatus(db, req.params.shiftId);
  ok(res, loadShift(db, req.params.shiftId));
});

// ── Swap Requests ─────────────────────────────────────────────────────────────

router.get("/shifts/swaps/", (_req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare("SELECT * FROM swap_requests ORDER BY created_at DESC").all());
});

router.post("/shifts/swaps/", (req: Request, res: Response) => {
  const db = getDb();
  const { shift_id, requester_id, target_user_id, message } =
    req.body as Partial<{ shift_id: string; requester_id: string; target_user_id: string; message: string }>;
  if (!shift_id || !requester_id) return badRequest(res, "shift_id, requester_id required");
  const id = `swap-${randomUUID().slice(0, 8)}`;
  db.prepare(
    "INSERT INTO swap_requests (id, shift_id, requester_id, target_user_id, message) VALUES (?, ?, ?, ?, ?)"
  ).run(id, shift_id, requester_id, target_user_id ?? null, message ?? null);
  ok(res, db.prepare("SELECT * FROM swap_requests WHERE id = ?").get(id), 201);
});

router.post("/shifts/swaps/:swapId/:action", (req: Request, res: Response) => {
  const db = getDb();
  const { swapId, action } = req.params;
  const validActions = ["approved", "denied", "accepted", "withdrawn"] as const;
  if (!validActions.includes(action as (typeof validActions)[number])) {
    return badRequest(res, `action must be one of: ${validActions.join(", ")}`);
  }
  const swap = db.prepare("SELECT * FROM swap_requests WHERE id = ?").get(swapId) as Record<string, unknown> | undefined;
  if (!swap) return notFound(res, "Swap request not found");

  db.prepare(
    "UPDATE swap_requests SET status = ?, resolved_at = datetime('now') WHERE id = ?"
  ).run(action, swapId);

  if (action === "approved" && swap.target_user_id) {
    const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(swap.shift_id as string);
    if (shift) {
      db.prepare("DELETE FROM shift_assignees WHERE shift_id = ? AND user_id = ?").run(swap.shift_id, swap.requester_id);
      try {
        db.prepare("INSERT INTO shift_assignees (shift_id, user_id) VALUES (?, ?)").run(swap.shift_id, swap.target_user_id);
      } catch {}
      recalcStatus(db, swap.shift_id as string);
    }
  }

  ok(res, db.prepare("SELECT * FROM swap_requests WHERE id = ?").get(swapId));
});

// ── Marketplace ───────────────────────────────────────────────────────────────

router.get("/shifts/marketplace/", (_req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare("SELECT * FROM marketplace_listings ORDER BY posted_at DESC").all());
});

router.post("/shifts/marketplace/", (req: Request, res: Response) => {
  const db = getDb();
  const { shift_id, posted_by_user_id, bonus_usd, note } =
    req.body as Partial<{ shift_id: string; posted_by_user_id: string; bonus_usd: number; note: string }>;
  if (!shift_id || !posted_by_user_id) return badRequest(res, "shift_id, posted_by_user_id required");
  const id = `mkt-${randomUUID().slice(0, 8)}`;
  db.prepare(
    "INSERT INTO marketplace_listings (id, shift_id, posted_by_user_id, bonus_usd, note) VALUES (?, ?, ?, ?, ?)"
  ).run(id, shift_id, posted_by_user_id, bonus_usd ?? null, note ?? null);
  ok(res, db.prepare("SELECT * FROM marketplace_listings WHERE id = ?").get(id), 201);
});

router.post("/shifts/marketplace/:listingId/claim", (req: Request, res: Response) => {
  const db = getDb();
  const { user_id } = req.body as { user_id: string };
  if (!user_id) return badRequest(res, "user_id required");
  const listing = db.prepare(
    "SELECT * FROM marketplace_listings WHERE id = ? AND status = 'open'"
  ).get(req.params.listingId) as Record<string, unknown> | undefined;
  if (!listing) return notFound(res, "Listing not found or already claimed");

  db.prepare(
    "UPDATE marketplace_listings SET status = 'claimed', claimed_by_user_id = ?, claimed_at = datetime('now') WHERE id = ?"
  ).run(user_id, req.params.listingId);

  const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(listing.shift_id as string);
  if (shift) {
    try {
      db.prepare("INSERT INTO shift_assignees (shift_id, user_id) VALUES (?, ?)").run(listing.shift_id, user_id);
    } catch {}
    recalcStatus(db, listing.shift_id as string);
  }

  ok(res, db.prepare("SELECT * FROM marketplace_listings WHERE id = ?").get(req.params.listingId));
});

router.post("/shifts/marketplace/:listingId/cancel", (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare(
    "UPDATE marketplace_listings SET status = 'cancelled' WHERE id = ? AND status = 'open'"
  ).run(req.params.listingId);
  if (result.changes === 0) return notFound(res, "Listing not found or not open");
  ok(res, db.prepare("SELECT * FROM marketplace_listings WHERE id = ?").get(req.params.listingId));
});

export default router;
