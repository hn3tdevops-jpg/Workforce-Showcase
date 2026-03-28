import { Router, type Request, type Response } from "express";
import { getDb } from "../hospitable/db.js";

const router = Router();

function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }

/** GET /notifications */
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const { unread_only, limit = 30 } = req.query;
  let where = "WHERE 1=1";
  if (unread_only === "true") where += " AND read_at IS NULL";
  ok(res, db.prepare(`
    SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ?
  `).all(+limit));
});

/** GET /notifications/unread-count */
router.get("/unread-count", (req: Request, res: Response) => {
  const db = getDb();
  const n = (db.prepare("SELECT COUNT(*) as n FROM notifications WHERE read_at IS NULL").get() as { n: number }).n;
  ok(res, { count: n });
});

/** POST /notifications */
router.post("/", (req: Request, res: Response) => {
  const { type = "info", title, body, link } = req.body;
  if (!title) { res.status(400).json({ detail: "title required" }); return; }
  const db = getDb();
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  db.prepare(`
    INSERT INTO notifications (id, type, title, body, link, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(id, type, title, body ?? null, link ?? null);
  ok(res, db.prepare("SELECT * FROM notifications WHERE id = ?").get(id), 201);
});

/** PATCH /notifications/:id/read */
router.patch("/:id/read", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ?").run(req.params.id);
  ok(res, { ok: true });
});

/** POST /notifications/read-all */
router.post("/read-all", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE read_at IS NULL").run();
  ok(res, { ok: true });
});

export default router;
