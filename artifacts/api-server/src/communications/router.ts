import { Router, type Request, type Response } from "express";
import { getDb } from "../hospitable/db.js";

const router = Router();

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function notFound(res: Response, msg = "Not found") { res.status(404).json({ detail: msg }); }
function bad(res: Response, msg: string) { res.status(400).json({ detail: msg }); }

const BIZ = "biz-silver-sands";

const MSG_SELECT = `
  SELECT
    cm.*,
    ep.legal_first_name || ' ' || ep.legal_last_name AS author_ep_name,
    ep.job_title AS author_title,
    ep.department AS author_dept
  FROM comm_messages cm
  LEFT JOIN employee_profiles ep ON ep.id = cm.author_ep_id
`;

const REPLY_SELECT = `
  SELECT
    cr.*,
    ep.legal_first_name || ' ' || ep.legal_last_name AS author_ep_name,
    ep.job_title AS author_title
  FROM comm_replies cr
  LEFT JOIN employee_profiles ep ON ep.id = cr.author_ep_id
`;

// ── GET /communications/unread-count ──────────────────────────────────────────
router.get("/unread-count", (req: Request, res: Response) => {
  const userId = (req.headers["x-user-id"] as string) ?? null;
  if (!userId) return ok(res, { count: 0 });
  const db = getDb();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM comm_messages cm
    WHERE cm.business_id = ? AND cm.is_archived = 0
      AND cm.id NOT IN (SELECT message_id FROM comm_reads WHERE user_id = ?)
  `).get(BIZ, userId) as { count: number };
  ok(res, { count: row.count });
});

// ── GET /communications/summary ───────────────────────────────────────────────
router.get("/summary", (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT type, COUNT(*) as count FROM comm_messages
    WHERE business_id = ? AND is_archived = 0
    GROUP BY type
  `).all(BIZ) as { type: string; count: number }[];

  const byType: Record<string, number> = {};
  for (const r of rows) byType[r.type] = r.count;

  const pinned = (db.prepare("SELECT COUNT(*) as n FROM comm_messages WHERE business_id = ? AND is_pinned = 1 AND is_archived = 0").get(BIZ) as { n: number }).n;
  const urgent = (db.prepare("SELECT COUNT(*) as n FROM comm_messages WHERE business_id = ? AND priority = 'URGENT' AND is_archived = 0").get(BIZ) as { n: number }).n;

  ok(res, { total: rows.reduce((s, r) => s + r.count, 0), by_type: byType, pinned, urgent });
});

// ── GET /communications ───────────────────────────────────────────────────────
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const { type, priority, archived, target_type, limit = "100", skip = "0" } = req.query;
  const userId = (req.headers["x-user-id"] as string) ?? null;

  let where = "WHERE cm.business_id = ?";
  const params: unknown[] = [BIZ];

  where += " AND cm.is_archived = ?";
  params.push(archived === "1" ? 1 : 0);

  if (type)        { where += " AND cm.type = ?";        params.push(type); }
  if (priority)    { where += " AND cm.priority = ?";    params.push(priority); }
  if (target_type) { where += " AND cm.target_type = ?"; params.push(target_type); }

  const rows = db.prepare(`
    ${MSG_SELECT}
    ${where}
    ORDER BY cm.is_pinned DESC, cm.priority DESC, cm.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, +limit, +skip) as any[];

  if (userId) {
    const readSet = new Set<string>(
      (db.prepare("SELECT message_id FROM comm_reads WHERE user_id = ?").all(userId) as { message_id: string }[])
        .map(r => r.message_id)
    );
    for (const r of rows) r.is_read = readSet.has(r.id);
  }

  ok(res, rows);
});

// ── GET /communications/:id ───────────────────────────────────────────────────
router.get("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const msg = db.prepare(`${MSG_SELECT} WHERE cm.id = ? AND cm.business_id = ?`).get(req.params.id, BIZ) as any;
  if (!msg) return notFound(res);

  const replies = db.prepare(`${REPLY_SELECT} WHERE cr.message_id = ? ORDER BY cr.created_at ASC`).all(req.params.id) as any[];
  msg.replies = replies;

  const userId = (req.headers["x-user-id"] as string) ?? null;
  if (userId) {
    const read = db.prepare("SELECT 1 FROM comm_reads WHERE message_id = ? AND user_id = ?").get(req.params.id, userId);
    msg.is_read = !!read;
  }

  ok(res, msg);
});

// ── POST /communications ──────────────────────────────────────────────────────
router.post("/", (req: Request, res: Response) => {
  const { subject, body, type = "ANNOUNCEMENT", priority = "NORMAL", target_type = "ALL", target_value, author_user_id, author_ep_id, author_name, is_pinned = false, expires_at } = req.body;
  if (!subject?.trim()) return bad(res, "subject required");
  if (!body?.trim())    return bad(res, "body required");
  if (!["ANNOUNCEMENT","HANDOVER","NOTICE"].includes(type)) return bad(res, "invalid type");
  if (!["NORMAL","HIGH","URGENT"].includes(priority)) return bad(res, "invalid priority");

  const db = getDb();
  const id = uid();
  db.prepare(`
    INSERT INTO comm_messages (id, type, subject, body, priority, target_type, target_value, author_user_id, author_ep_id, author_name, is_pinned, business_id, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, type, subject.trim(), body.trim(), priority, target_type, target_value ?? null, author_user_id ?? null, author_ep_id ?? null, author_name ?? null, is_pinned ? 1 : 0, BIZ, expires_at ?? null);

  const msg = db.prepare(`${MSG_SELECT} WHERE cm.id = ?`).get(id) as any;
  ok(res, msg, 201);
});

// ── PATCH /communications/:id ─────────────────────────────────────────────────
router.patch("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const msg = db.prepare("SELECT * FROM comm_messages WHERE id = ? AND business_id = ?").get(req.params.id, BIZ) as any;
  if (!msg) return notFound(res);

  const { subject, body, priority, target_type, target_value, is_pinned, is_archived, expires_at } = req.body;

  db.prepare(`
    UPDATE comm_messages SET
      subject     = COALESCE(?, subject),
      body        = COALESCE(?, body),
      priority    = COALESCE(?, priority),
      target_type = COALESCE(?, target_type),
      target_value = COALESCE(?, target_value),
      is_pinned   = COALESCE(?, is_pinned),
      is_archived = COALESCE(?, is_archived),
      expires_at  = COALESCE(?, expires_at),
      updated_at  = datetime('now')
    WHERE id = ?
  `).run(
    subject ?? null, body ?? null, priority ?? null,
    target_type ?? null, target_value ?? null,
    is_pinned != null ? (is_pinned ? 1 : 0) : null,
    is_archived != null ? (is_archived ? 1 : 0) : null,
    expires_at ?? null,
    req.params.id
  );

  ok(res, db.prepare(`${MSG_SELECT} WHERE cm.id = ?`).get(req.params.id));
});

// ── DELETE /communications/:id ────────────────────────────────────────────────
router.delete("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const msg = db.prepare("SELECT id FROM comm_messages WHERE id = ? AND business_id = ?").get(req.params.id, BIZ);
  if (!msg) return notFound(res);
  db.prepare("DELETE FROM comm_messages WHERE id = ?").run(req.params.id);
  ok(res, { ok: true });
});

// ── POST /communications/:id/read ─────────────────────────────────────────────
router.post("/:id/read", (req: Request, res: Response) => {
  const { user_id } = req.body;
  if (!user_id) return bad(res, "user_id required");
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO comm_reads (message_id, user_id) VALUES (?, ?)").run(req.params.id, user_id);
  ok(res, { ok: true });
});

// ── POST /communications/:id/reply ────────────────────────────────────────────
router.post("/:id/reply", (req: Request, res: Response) => {
  const { body, author_user_id, author_ep_id, author_name } = req.body;
  if (!body?.trim()) return bad(res, "body required");

  const db = getDb();
  const msg = db.prepare("SELECT id FROM comm_messages WHERE id = ? AND business_id = ?").get(req.params.id, BIZ);
  if (!msg) return notFound(res);

  const id = uid();
  db.prepare(`
    INSERT INTO comm_replies (id, message_id, author_user_id, author_ep_id, author_name, body)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, author_user_id ?? null, author_ep_id ?? null, author_name ?? null, body.trim());

  db.prepare("UPDATE comm_messages SET reply_count = reply_count + 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  const reply = db.prepare(`${REPLY_SELECT} WHERE cr.id = ?`).get(id);
  ok(res, reply, 201);
});

export default router;
