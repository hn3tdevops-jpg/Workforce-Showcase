import { Router, type Request, type Response } from "express";
import { getDb } from "../hospitable/db.js";

const router = Router();

function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function notFound(res: Response, msg = "Not found") { res.status(404).json({ detail: msg }); }
function bad(res: Response, msg: string) { res.status(400).json({ detail: msg }); }

/** GET /inventory/rooms — rooms list for selector */
router.get("/rooms", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare(`
    SELECT id, room_number AS num, room_type, housekeeping_status, maintenance_status
    FROM hk_rooms WHERE location_id = 'loc-001' ORDER BY room_number
  `).all());
});

/** GET /inventory/supply-pars?room_id= */
router.get("/supply-pars", (req: Request, res: Response) => {
  const db = getDb();
  const { room_id } = req.query;
  if (!room_id) return bad(res, "room_id required");
  ok(res, db.prepare(`
    SELECT sp.*, hr.room_number
    FROM hk_room_supply_pars sp
    JOIN hk_rooms hr ON hr.id = sp.room_id
    WHERE sp.room_id = ?
    ORDER BY sp.item_name
  `).all(room_id));
});

/** PATCH /inventory/supply-pars/:id */
router.patch("/supply-pars/:id", (req: Request, res: Response) => {
  const db = getDb();
  const { expected_qty, min_qty, item_name } = req.body;
  db.prepare(`
    UPDATE hk_room_supply_pars SET
      expected_qty = COALESCE(?, expected_qty),
      min_qty      = COALESCE(?, min_qty),
      item_name    = COALESCE(?, item_name),
      updated_at   = datetime('now')
    WHERE id = ?
  `).run(expected_qty ?? null, min_qty ?? null, item_name ?? null, req.params.id);
  const row = db.prepare("SELECT * FROM hk_room_supply_pars WHERE id = ?").get(req.params.id);
  if (!row) return notFound(res);
  ok(res, row);
});

/** GET /inventory/assets?room_id= */
router.get("/assets", (req: Request, res: Response) => {
  const db = getDb();
  const room_id = Array.isArray(req.query.room_id) ? req.query.room_id[0] : req.query.room_id;
  if (!room_id) return bad(res, "room_id required");
  ok(res, db.prepare(`
    SELECT a.*, hr.room_number
    FROM hk_room_assets a
    JOIN hk_rooms hr ON hr.id = a.room_id
    WHERE a.room_id = ?
    ORDER BY a.asset_name
  `).all(room_id));
});

/** PATCH /inventory/assets/:id */
router.patch("/assets/:id", (req: Request, res: Response) => {
  const db = getDb();
  const { quantity_present, condition_status, maintenance_notes } = req.body;
  db.prepare(`
    UPDATE hk_room_assets SET
      quantity_present  = COALESCE(?, quantity_present),
      condition_status  = COALESCE(?, condition_status),
      maintenance_notes = COALESCE(?, maintenance_notes),
      updated_at        = datetime('now')
    WHERE id = ?
  `).run(quantity_present ?? null, condition_status ?? null, maintenance_notes ?? null, req.params.id);
  const row = db.prepare("SELECT * FROM hk_room_assets WHERE id = ?").get(req.params.id);
  if (!row) return notFound(res);
  ok(res, row);
});

/** GET /inventory/summary */
router.get("/summary", (req: Request, res: Response) => {
  const db = getDb();
  const totalRooms = (db.prepare("SELECT COUNT(*) as n FROM hk_rooms WHERE location_id='loc-001'").get() as { n: number }).n;
  const totalAssets = (db.prepare("SELECT SUM(quantity_expected) as s FROM hk_room_assets").get() as { s: number | null }).s ?? 0;
  const missingAssets = (db.prepare("SELECT SUM(quantity_expected - quantity_present) as s FROM hk_room_assets WHERE quantity_present < quantity_expected").get() as { s: number | null }).s ?? 0;
  const conditionIssues = (db.prepare("SELECT COUNT(*) as n FROM hk_room_assets WHERE condition_status != 'ok'").get() as { n: number }).n;
  const lowSupplies = (db.prepare("SELECT COUNT(*) as n FROM hk_room_supply_pars WHERE expected_qty > 0").get() as { n: number }).n;
  ok(res, { totalRooms, totalAssets, missingAssets, conditionIssues, lowSupplies });
});

export default router;
