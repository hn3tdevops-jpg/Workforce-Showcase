import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { getDb } from "../hospitable/db.js";

const router = Router();

function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function notFound(res: Response, msg = "Not found") { res.status(404).json({ detail: msg }); }
function badRequest(res: Response, msg: string) { res.status(400).json({ detail: msg }); }

// ── Locations ─────────────────────────────────────────────────────────────────

router.get("/locations/", (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(
    "SELECT id, business_id, name, address, timezone, is_active FROM local_locations WHERE is_active = 1 ORDER BY name"
  ).all();
  ok(res, rows);
});

router.get("/locations/:locationId", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    "SELECT id, business_id, name, address, timezone, is_active FROM local_locations WHERE id = ?"
  ).get(req.params.locationId);
  if (!row) return notFound(res);
  ok(res, row);
});

router.patch("/locations/:locationId", (req: Request, res: Response) => {
  const db = getDb();
  const { name, address, timezone } = req.body as Partial<{ name: string; address: string; timezone: string }>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (name      !== undefined) { sets.push("name = ?");     vals.push(name);     }
  if (address   !== undefined) { sets.push("address = ?");  vals.push(address);  }
  if (timezone  !== undefined) { sets.push("timezone = ?"); vals.push(timezone); }
  if (!sets.length) return badRequest(res, "No fields to update");
  sets.push("updated_at = datetime('now')");
  vals.push(req.params.locationId);
  db.prepare(`UPDATE local_locations SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  const updated = db.prepare("SELECT * FROM local_locations WHERE id = ?").get(req.params.locationId);
  if (!updated) return notFound(res);
  ok(res, updated);
});

// ── Users / Staff ─────────────────────────────────────────────────────────────

router.get("/users/", (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(
    "SELECT id, email, first_name, last_name, job_title, role, phone, hire_date, is_active FROM local_staff ORDER BY first_name, last_name"
  ).all();
  ok(res, rows);
});

router.get("/users/:userId", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    "SELECT id, email, first_name, last_name, job_title, role, phone, hire_date, is_active FROM local_staff WHERE id = ?"
  ).get(req.params.userId);
  if (!row) return notFound(res);
  ok(res, row);
});

router.post("/users/", (req: Request, res: Response) => {
  const db = getDb();
  const { email, first_name, last_name, job_title, role, phone, hire_date } =
    req.body as Partial<{
      email: string; first_name: string; last_name: string;
      job_title: string; role: string; phone: string; hire_date: string;
    }>;
  if (!email || !first_name || !last_name) return badRequest(res, "email, first_name, last_name required");
  const id = `user-${randomUUID().slice(0, 8)}`;
  db.prepare(
    "INSERT INTO local_staff (id, email, first_name, last_name, job_title, role, phone, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, email, first_name, last_name, job_title ?? null, role ?? "staff", phone ?? null, hire_date ?? null);
  const created = db.prepare("SELECT * FROM local_staff WHERE id = ?").get(id);
  ok(res, created, 201);
});

router.patch("/users/:userId", (req: Request, res: Response) => {
  const db = getDb();
  const fields = ["first_name", "last_name", "email", "job_title", "role", "phone", "hire_date", "is_active"] as const;
  const body = req.body as Record<string, unknown>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); }
  }
  if (!sets.length) return badRequest(res, "No fields to update");
  sets.push("updated_at = datetime('now')");
  vals.push(req.params.userId);
  const result = db.prepare(`UPDATE local_staff SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  if (result.changes === 0) return notFound(res);
  const updated = db.prepare("SELECT * FROM local_staff WHERE id = ?").get(req.params.userId);
  ok(res, updated);
});

router.delete("/users/:userId", (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare(
    "UPDATE local_staff SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
  ).run(req.params.userId);
  if (result.changes === 0) return notFound(res);
  ok(res, { detail: "User deactivated" });
});

// ── Roles (static list) ───────────────────────────────────────────────────────

router.get("/roles/", (_req: Request, res: Response) => {
  ok(res, [
    { id: "owner",      name: "Owner",             permissions: ["*"] },
    { id: "supervisor", name: "Supervisor",        permissions: ["rooms:write", "tasks:write", "staff:read"] },
    { id: "staff",      name: "Staff",             permissions: ["tasks:read", "tasks:write:own"] },
    { id: "concierge",  name: "Concierge",         permissions: ["rooms:read"] },
  ]);
});

// ── Business Settings ─────────────────────────────────────────────────────────

router.get("/business/:businessId/settings", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM business_settings WHERE business_id = ?").get(req.params.businessId);
  if (row) return ok(res, row);
  const defaults = {
    business_id: req.params.businessId,
    display_name: null,
    logo_url: null,
    primary_color: "#6366f1",
    accent_color: "#14b8a6",
    enabled_modules: '["dashboard","rooms","property-map","tasks","assignments","shifts","timeline","users","session"]',
    custom_labels: "{}",
    updated_at: new Date().toISOString(),
  };
  ok(res, defaults);
});

router.patch("/business/:businessId/settings", (req: Request, res: Response) => {
  const db = getDb();
  const fields = ["display_name", "logo_url", "primary_color", "accent_color", "enabled_modules", "custom_labels"] as const;
  const body = req.body as Record<string, unknown>;
  const existing = db.prepare("SELECT business_id FROM business_settings WHERE business_id = ?").get(req.params.businessId);

  if (!existing) {
    db.prepare(
      "INSERT INTO business_settings (business_id, display_name, logo_url, primary_color, accent_color, enabled_modules, custom_labels) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      req.params.businessId,
      body.display_name ?? null,
      body.logo_url ?? null,
      body.primary_color ?? "#6366f1",
      body.accent_color ?? "#14b8a6",
      body.enabled_modules ?? '["dashboard","rooms","property-map","tasks","assignments","shifts","timeline","users","session"]',
      body.custom_labels ?? "{}"
    );
  } else {
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); }
    }
    if (!sets.length) return badRequest(res, "No fields to update");
    sets.push("updated_at = datetime('now')");
    vals.push(req.params.businessId);
    db.prepare(`UPDATE business_settings SET ${sets.join(", ")} WHERE business_id = ?`).run(...vals);
  }
  ok(res, db.prepare("SELECT * FROM business_settings WHERE business_id = ?").get(req.params.businessId));
});

// ── User Preferences ──────────────────────────────────────────────────────────

router.get("/users/:userId/preferences", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(req.params.userId);
  if (row) return ok(res, row);
  ok(res, {
    user_id: req.params.userId,
    theme: "dark",
    default_location_id: null,
    sidebar_compact: 0,
    density: "comfortable",
    updated_at: new Date().toISOString(),
  });
});

router.patch("/users/:userId/preferences", (req: Request, res: Response) => {
  const db = getDb();
  const fields = ["theme", "default_location_id", "sidebar_compact", "density"] as const;
  const body = req.body as Record<string, unknown>;
  const existing = db.prepare("SELECT user_id FROM user_preferences WHERE user_id = ?").get(req.params.userId);

  if (!existing) {
    db.prepare(
      "INSERT INTO user_preferences (user_id, theme, default_location_id, sidebar_compact, density) VALUES (?, ?, ?, ?, ?)"
    ).run(
      req.params.userId,
      body.theme ?? "dark",
      body.default_location_id ?? null,
      body.sidebar_compact ? 1 : 0,
      body.density ?? "comfortable"
    );
  } else {
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(f === "sidebar_compact" ? (body[f] ? 1 : 0) : body[f]);
      }
    }
    if (!sets.length) return badRequest(res, "No fields to update");
    sets.push("updated_at = datetime('now')");
    vals.push(req.params.userId);
    db.prepare(`UPDATE user_preferences SET ${sets.join(", ")} WHERE user_id = ?`).run(...vals);
  }
  ok(res, db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(req.params.userId));
});

export default router;
