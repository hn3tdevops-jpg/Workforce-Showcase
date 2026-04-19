import { Router, type Request, type Response } from "express";
import { getDb } from "./db.js";

const router = Router();

// ── helpers ────────────────────────────────────────────────────────────────

function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json(data);
}

function notFound(res: Response, msg = "Not found") {
  res.status(404).json({ detail: msg });
}

function badRequest(res: Response, msg: string) {
  res.status(400).json({ detail: msg });
}

function now() {
  return new Date().toISOString();
}

// ── Property tree ─────────────────────────────────────────────────────────

router.get("/locations/:locationId/property-tree", (req: Request, res: Response) => {
  const db = getDb();
  const { locationId } = req.params;

  const buildings = db.prepare(
    "SELECT * FROM property_buildings WHERE location_id = ? ORDER BY sort_order"
  ).all(locationId) as any[];

  const result = buildings.map((b) => {
    const floors = db.prepare(
      "SELECT * FROM property_floors WHERE building_id = ? ORDER BY sort_order"
    ).all(b.id) as any[];

    return {
      id: b.id,
      location_id: b.location_id,
      code: b.code,
      name: b.name,
      sort_order: b.sort_order,
      is_active: Boolean(b.is_active),
      floors: floors.map((f) => {
        const sectors = db.prepare(
          "SELECT * FROM property_sectors WHERE floor_id = ? ORDER BY sort_order"
        ).all(f.id) as any[];

        return {
          id: f.id,
          building_id: f.building_id,
          floor_number: f.floor_number,
          label: f.label,
          sort_order: f.sort_order,
          sectors: sectors.map((s) => ({
            id: s.id,
            floor_id: s.floor_id,
            code: s.code,
            name: s.name,
            description: s.description ?? null,
            sort_order: s.sort_order,
          })),
        };
      }),
    };
  });

  ok(res, { location_id: locationId, buildings: result });
});

// ── Buildings ─────────────────────────────────────────────────────────────

router.post("/buildings", (req: Request, res: Response) => {
  const { location_id, code, name, sort_order = 0, is_active = true } = req.body;
  if (!location_id || !code || !name) return badRequest(res, "location_id, code, name required");
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO property_buildings (location_id, code, name, sort_order, is_active) VALUES (?,?,?,?,?)"
  ).run(location_id, code, name, sort_order, is_active ? 1 : 0);
  const building = db.prepare("SELECT * FROM property_buildings WHERE id = ?").get(result.lastInsertRowid);
  ok(res, building, 201);
});

// ── Floors ────────────────────────────────────────────────────────────────

router.post("/floors", (req: Request, res: Response) => {
  const { building_id, floor_number, label, sort_order = 0 } = req.body;
  if (!building_id || floor_number === undefined || !label) return badRequest(res, "building_id, floor_number, label required");
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO property_floors (building_id, floor_number, label, sort_order) VALUES (?,?,?,?)"
  ).run(building_id, floor_number, label, sort_order);
  ok(res, db.prepare("SELECT * FROM property_floors WHERE id = ?").get(result.lastInsertRowid), 201);
});

// ── Sectors ───────────────────────────────────────────────────────────────

router.post("/sectors", (req: Request, res: Response) => {
  const { floor_id, code, name, description, sort_order = 0 } = req.body;
  if (!floor_id || !code || !name) return badRequest(res, "floor_id, code, name required");
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO property_sectors (floor_id, code, name, description, sort_order) VALUES (?,?,?,?,?)"
  ).run(floor_id, code, name, description ?? null, sort_order);
  ok(res, db.prepare("SELECT * FROM property_sectors WHERE id = ?").get(result.lastInsertRowid), 201);
});

// ── Room groups ───────────────────────────────────────────────────────────

router.get("/locations/:locationId/room-groups", (req: Request, res: Response) => {
  const db = getDb();
  const groups = db.prepare(
    "SELECT * FROM hk_room_groups WHERE location_id = ? ORDER BY id"
  ).all(req.params.locationId);
  ok(res, groups);
});

router.post("/room-groups", (req: Request, res: Response) => {
  const { location_id, name, color, description } = req.body;
  if (!location_id || !name) return badRequest(res, "location_id, name required");
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO hk_room_groups (location_id, name, color, description) VALUES (?,?,?,?)"
  ).run(location_id, name, color ?? null, description ?? null);
  ok(res, db.prepare("SELECT * FROM hk_room_groups WHERE id = ?").get(result.lastInsertRowid), 201);
});

// ── Rooms ─────────────────────────────────────────────────────────────────

function formatRoom(r: any) {
  if (!r) return null;
  return {
    ...r,
    is_active: Boolean(r.is_active),
  };
}

router.get("/rooms", (req: Request, res: Response) => {
  const db = getDb();
  const location_id = Array.isArray(req.query.location_id) ? req.query.location_id[0] : req.query.location_id;
  const housekeeping_status = Array.isArray(req.query.housekeeping_status) ? req.query.housekeeping_status[0] : req.query.housekeeping_status;
  const sector_id = Array.isArray(req.query.sector_id) ? req.query.sector_id[0] : req.query.sector_id;


  let sql = `SELECT r.*,
    b.name  AS building_name,
    b.code  AS building_code,
    f.label AS floor_label,
    f.floor_number AS floor_number
  FROM hk_rooms r
  LEFT JOIN property_buildings b ON b.id = r.building_id
  LEFT JOIN property_floors    f ON f.id = r.floor_id
  WHERE 1=1`;
  const params: any[] = [];

  if (location_id)        { sql += " AND r.location_id = ?";        params.push(location_id); }
  if (housekeeping_status){ sql += " AND r.housekeeping_status = ?"; params.push(housekeeping_status); }
  if (sector_id)          { sql += " AND r.sector_id = ?";           params.push(sector_id); }
  sql += " ORDER BY b.sort_order, f.sort_order, CAST(r.room_number AS INTEGER), r.room_number";

  const rooms = db.prepare(sql).all(...params).map(formatRoom);
  ok(res, rooms);
});

router.post("/rooms", (req: Request, res: Response) => {
  const {
    location_id, building_id, floor_id, sector_id, room_group_id,
    room_number, room_label, room_type, bed_count, bed_type_summary,
    housekeeping_status = "dirty", occupancy_status = "vacant",
    inspection_status = "not_required",
  } = req.body;
  if (!location_id || !room_number) return badRequest(res, "location_id, room_number required");
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO hk_rooms
      (location_id, building_id, floor_id, sector_id, room_group_id, room_number,
       room_label, room_type, bed_count, bed_type_summary, housekeeping_status,
       occupancy_status, inspection_status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    location_id, building_id ?? null, floor_id ?? null, sector_id ?? null,
    room_group_id ?? null, room_number, room_label ?? null, room_type ?? null,
    bed_count ?? null, bed_type_summary ?? null, housekeeping_status,
    occupancy_status, inspection_status,
  );
  ok(res, formatRoom(db.prepare("SELECT * FROM hk_rooms WHERE id = ?").get(result.lastInsertRowid)), 201);
});

router.get("/rooms/:roomId", (req: Request, res: Response) => {
  const db = getDb();
  const room = db.prepare("SELECT * FROM hk_rooms WHERE id = ?").get(req.params.roomId);
  if (!room) return notFound(res, "Room not found");
  ok(res, formatRoom(room));
});

router.patch("/rooms/:roomId", (req: Request, res: Response) => {
  const db = getDb();
  const room = db.prepare("SELECT * FROM hk_rooms WHERE id = ?").get(req.params.roomId) as any;
  if (!room) return notFound(res, "Room not found");

  const {
    room_number, room_label, room_type, bed_count, bed_type_summary,
    pet_policy, smoking_status, notes,
  } = req.body;

  const updates: string[] = ["updated_at = ?"];
  const params: any[] = [now()];

  if (room_number     !== undefined) { updates.push("room_number = ?");     params.push(room_number); }
  if (room_label      !== undefined) { updates.push("room_label = ?");      params.push(room_label); }
  if (room_type       !== undefined) { updates.push("room_type = ?");       params.push(room_type); }
  if (bed_count       !== undefined) { updates.push("bed_count = ?");       params.push(bed_count); }
  if (bed_type_summary!== undefined) { updates.push("bed_type_summary = ?");params.push(bed_type_summary); }
  if (pet_policy      !== undefined) { updates.push("pet_policy = ?");      params.push(pet_policy); }
  if (smoking_status  !== undefined) { updates.push("smoking_status = ?");  params.push(smoking_status); }
  if (notes           !== undefined) { updates.push("notes = ?");           params.push(notes); }

  params.push(req.params.roomId);
  db.prepare(`UPDATE hk_rooms SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  ok(res, formatRoom(db.prepare("SELECT * FROM hk_rooms WHERE id = ?").get(req.params.roomId)));
});

router.patch("/rooms/:roomId/status", (req: Request, res: Response) => {
  const db = getDb();
  const { housekeeping_status, occupancy_status, inspection_status, notes } = req.body;
  const room = db.prepare("SELECT * FROM hk_rooms WHERE id = ?").get(req.params.roomId) as any;
  if (!room) return notFound(res, "Room not found");

  const updates: string[] = ["updated_at = ?"];
  const params: any[] = [now()];

  if (housekeeping_status !== undefined) { updates.push("housekeeping_status = ?"); params.push(housekeeping_status); }
  if (occupancy_status !== undefined) { updates.push("occupancy_status = ?"); params.push(occupancy_status); }
  if (inspection_status !== undefined) { updates.push("inspection_status = ?"); params.push(inspection_status); }
  if (notes !== undefined) { updates.push("notes = ?"); params.push(notes); }
  if (housekeeping_status === "inspected") { updates.push("last_inspected_at = ?"); params.push(now()); }
  if (housekeeping_status === "clean" || housekeeping_status === "inspected") { updates.push("last_cleaned_at = ?"); params.push(now()); }

  params.push(req.params.roomId);
  db.prepare(`UPDATE hk_rooms SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  ok(res, formatRoom(db.prepare("SELECT * FROM hk_rooms WHERE id = ?").get(req.params.roomId)));
});

router.post("/rooms/bulk-status", (req: Request, res: Response) => {
  const { room_ids, housekeeping_status, occupancy_status, inspection_status } = req.body;
  if (!Array.isArray(room_ids) || room_ids.length === 0) return badRequest(res, "room_ids array required");

  const db = getDb();
  const updates: string[] = ["updated_at = ?"];
  const baseParams: any[] = [now()];
  if (housekeeping_status !== undefined) { updates.push("housekeeping_status = ?"); baseParams.push(housekeeping_status); }
  if (occupancy_status !== undefined) { updates.push("occupancy_status = ?"); baseParams.push(occupancy_status); }
  if (inspection_status !== undefined) { updates.push("inspection_status = ?"); baseParams.push(inspection_status); }

  const placeholders = room_ids.map(() => "?").join(",");
  db.prepare(`UPDATE hk_rooms SET ${updates.join(", ")} WHERE id IN (${placeholders})`).run(...baseParams, ...room_ids);

  ok(res, { updated_room_ids: room_ids, count: room_ids.length });
});

// ── Room assets ───────────────────────────────────────────────────────────

router.get("/rooms/:roomId/assets", (req: Request, res: Response) => {
  const db = getDb();
  const assets = db.prepare("SELECT * FROM hk_room_assets WHERE room_id = ? ORDER BY id").all(req.params.roomId);
  ok(res, assets);
});

router.post("/rooms/:roomId/assets", (req: Request, res: Response) => {
  const { asset_type, asset_name, quantity_expected = 1, quantity_present = 1, condition_status = "ok", maintenance_notes } = req.body;
  if (!asset_type || !asset_name) return badRequest(res, "asset_type, asset_name required");
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO hk_room_assets (room_id, asset_type, asset_name, quantity_expected, quantity_present, condition_status, maintenance_notes) VALUES (?,?,?,?,?,?,?)"
  ).run(req.params.roomId, asset_type, asset_name, quantity_expected, quantity_present, condition_status, maintenance_notes ?? null);
  ok(res, db.prepare("SELECT * FROM hk_room_assets WHERE id = ?").get(result.lastInsertRowid), 201);
});

// ── Supply pars ───────────────────────────────────────────────────────────

router.get("/rooms/:roomId/supply-pars", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare("SELECT * FROM hk_room_supply_pars WHERE room_id = ? ORDER BY id").all(req.params.roomId));
});

router.post("/rooms/:roomId/supply-pars", (req: Request, res: Response) => {
  const { item_code, item_name, expected_qty, min_qty, unit = "ea" } = req.body;
  if (!item_code || !item_name || expected_qty === undefined || min_qty === undefined) {
    return badRequest(res, "item_code, item_name, expected_qty, min_qty required");
  }
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO hk_room_supply_pars (room_id, item_code, item_name, expected_qty, min_qty, unit) VALUES (?,?,?,?,?,?)"
  ).run(req.params.roomId, item_code, item_name, expected_qty, min_qty, unit);
  ok(res, db.prepare("SELECT * FROM hk_room_supply_pars WHERE id = ?").get(result.lastInsertRowid), 201);
});

// ── Tasks ─────────────────────────────────────────────────────────────────

function formatTask(t: any) {
  if (!t) return null;
  return t;
}

// @ts-ignore - handler uses an async IIFE and returns via Express response methods
router.get("/tasks", (req: Request, res: Response) => {
  // Use an async IIFE so the outer handler remains synchronous (Express handler signature)
  void (async () => {
    const db = getDb();
    const location_id = Array.isArray(req.query.location_id) ? req.query.location_id[0] : req.query.location_id;
    const status = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;
    const room_id = Array.isArray(req.query.room_id) ? req.query.room_id[0] : req.query.room_id;
    const assigned_user_id = Array.isArray(req.query.assigned_user_id) ? req.query.assigned_user_id[0] : req.query.assigned_user_id;


    // Basic auth header check
    const authHeader = (req.headers.authorization ?? "").toString();
    if (!authHeader) return res.status(401).json({ detail: "Not authenticated" });

    // Helper to check permission list
    const hasPermIn = (perms: string[] | undefined, perm: string) => {
      if (!perms) return false;
      return perms.includes("*") || perms.includes(perm);
    };

    // Try local session override first
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    let allowedAll = false;
    let allowedLocations: string[] = [];
    let myEmployeeIds: string[] = [];

    try {
      const localRow = db.prepare("SELECT user_json FROM local_sessions WHERE token = ?").get(token) as { user_json: string } | undefined;
      if (localRow) {
        const user = JSON.parse(localRow.user_json) as any;
        if (hasPermIn(user.permissions, "tasks:read")) {
          allowedAll = true;
        }
      }
    } catch (err) {
      // ignore
    }

    // If not allowed yet, ask the auth access-context endpoint for effective scopes
    if (!allowedAll) {
      try {
        const host = req.get("host") ?? "localhost:3000";
        const proto = (req.protocol ?? "http").toString();
        const url = `${proto}://${host}/auth/me/access-context`;
        const acRes = await fetch(url, { headers: { authorization: authHeader } });
        if (!acRes.ok) {
          const text = await acRes.text();
          // Propagate upstream 401/403 details if present
          try { return res.status(acRes.status).json(JSON.parse(text)); } catch { return res.status(acRes.status).send(text); }
        }
        const ac = await acRes.json() as any;

        // Gather permissions and scopes
        for (const s of ac.scopes || []) {
          const perms: string[] = s.effective_permissions || [];
          if (perms.includes("*") || perms.includes("tasks:read")) {
            allowedAll = true;
          }
          // business-level assignment grants access to all locations of the business
          for (const a of s.assignments || []) {
            if (a.scope_type === "BUSINESS") {
              allowedAll = true;
            } else if (a.scope_type === "LOCATION" && a.location_id) {
              allowedLocations.push(a.location_id);
            }
          }
          if (s.employee_profile_id) myEmployeeIds.push(s.employee_profile_id);
          // if user has tasks:write:own but not tasks:read, keep employee ids to allow own-task listing
          if (perms.includes("tasks:write:own") && !allowedAll) {
            // ensure myEmployeeIds is set (already done)
          }
        }
      } catch (err) {
        // On any error calling access-context, deny access
        return res.status(403).json({ detail: "Forbidden" });
      }
    }

    // Enforce location scoping
    if (location_id) {
      if (!allowedAll && !allowedLocations.includes(location_id)) {
        return res.status(403).json({ detail: "Forbidden: location not in caller scope" });
      }
    }

    // Build SQL with additional RBAC filters when not allowedAll
    let sql = `SELECT t.*, r.room_number,
                 ep.legal_first_name || ' ' || ep.legal_last_name AS assignee_ep_name,
                 ep.job_title AS assignee_ep_title,
                 ep.employee_code AS assignee_ep_code
               FROM hk_tasks t
               LEFT JOIN hk_rooms r ON r.id = t.room_id
               LEFT JOIN employee_profiles ep ON ep.id = t.assignee_ep_id
               WHERE 1=1`;
    const params: any[] = [];
    if (status) { sql += " AND t.status = ?"; params.push(status); }
    if (room_id) { sql += " AND t.room_id = ?"; params.push(room_id); }
    if (assigned_user_id) { sql += " AND t.assigned_user_id = ?"; params.push(assigned_user_id); }

    if (allowedAll) {
      if (location_id) { sql += " AND t.location_id = ?"; params.push(location_id); }
    } else {
      // If caller has explicit allowedLocations, restrict to them
      if (allowedLocations.length > 0) {
        sql += ` AND t.location_id IN (${allowedLocations.map(() => "?").join(",")})`;
        params.push(...allowedLocations);
        if (location_id) { /* already checked it's in allowedLocations above */ }
      } else if (myEmployeeIds.length > 0) {
        // caller can only view tasks assigned to them
        sql += ` AND t.assignee_ep_id IN (${myEmployeeIds.map(() => "?").join(",")})`;
        params.push(...myEmployeeIds);
      } else {
        // no scopes that permit viewing tasks
        return res.status(403).json({ detail: "Forbidden" });
      }
    }

    sql += " ORDER BY t.created_at DESC";

    ok(res, db.prepare(sql).all(...params).map(formatTask));
  })().catch((err) => {
    // ensure any unexpected errors return a 500
    // eslint-disable-next-line no-console
    console.error(err);
    try { res.status(500).json({ detail: "Internal server error" }); } catch { /* ignore */ }
  });
});

router.post("/tasks", (req: Request, res: Response) => {
  const {
    location_id, room_id, task_type = "clean_checkout", title,
    description, priority = "normal", status = "open",
    assigned_user_id, due_at, created_by_user_id,
  } = req.body;
  if (!location_id || !title) return badRequest(res, "location_id, title required");
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO hk_tasks
      (location_id, room_id, task_type, title, description, priority, status,
       assigned_user_id, due_at, created_by_user_id)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(location_id, room_id ?? null, task_type, title, description ?? null,
         priority, status, assigned_user_id ?? null, due_at ?? null, created_by_user_id ?? null);

  const task = db.prepare("SELECT * FROM hk_tasks WHERE id = ?").get(result.lastInsertRowid) as any;
  if (status !== "open") {
    db.prepare("INSERT INTO hk_task_events (task_id, old_status, new_status) VALUES (?,?,?)").run(task.id, null, status);
  }
  ok(res, formatTask(task), 201);
});

router.patch("/tasks/:taskId/status", (req: Request, res: Response) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM hk_tasks WHERE id = ?").get(req.params.taskId) as any;
  if (!task) return notFound(res, "Task not found");

  const { status, changed_by_user_id, note } = req.body;
  if (!status) return badRequest(res, "status required");

  const extra: string[] = [];
  const extraParams: any[] = [];
  if (status === "in_progress" && !task.started_at) {
    extra.push("started_at = ?"); extraParams.push(now());
  }
  if (status === "done" || status === "cancelled") {
    extra.push("completed_at = ?"); extraParams.push(now());
  }

  db.prepare(`UPDATE hk_tasks SET status = ?, updated_at = ?${extra.length ? ", " + extra.join(", ") : ""} WHERE id = ?`)
    .run(status, now(), ...extraParams, req.params.taskId);
  db.prepare("INSERT INTO hk_task_events (task_id, old_status, new_status, changed_by_user_id, note) VALUES (?,?,?,?,?)")
    .run(req.params.taskId, task.status, status, changed_by_user_id ?? null, note ?? null);

  ok(res, formatTask(db.prepare("SELECT * FROM hk_tasks WHERE id = ?").get(req.params.taskId)));
});

router.post("/tasks/:taskId/assign", (req: Request, res: Response) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM hk_tasks WHERE id = ?").get(req.params.taskId) as any;
  if (!task) return notFound(res, "Task not found");

  const { assigned_user_id } = req.body as { assigned_user_id?: string | null };

  // null/undefined = unassign; revert to "open" if currently "assigned"
  const isUnassign = assigned_user_id == null;
  const newStatus = isUnassign
    ? (task.status === "assigned" ? "open" : task.status)
    : (task.status === "open" ? "assigned" : task.status);

  db.prepare("UPDATE hk_tasks SET assigned_user_id = ?, status = ?, updated_at = ? WHERE id = ?")
    .run(assigned_user_id ?? null, newStatus, now(), req.params.taskId);

  if (newStatus !== task.status) {
    db.prepare("INSERT INTO hk_task_events (task_id, old_status, new_status, changed_by_user_id) VALUES (?,?,?,?)")
      .run(req.params.taskId, task.status, newStatus, assigned_user_id ?? null);
  }

  ok(res, formatTask(db.prepare("SELECT * FROM hk_tasks WHERE id = ?").get(req.params.taskId)));
});

router.post("/tasks/:taskId/complete", (req: Request, res: Response) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM hk_tasks WHERE id = ?").get(req.params.taskId) as any;
  if (!task) return notFound(res, "Task not found");

  const { completed_by_user_id, note } = req.body;
  db.prepare("UPDATE hk_tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?")
    .run("done", now(), now(), req.params.taskId);
  db.prepare("INSERT INTO hk_task_events (task_id, old_status, new_status, changed_by_user_id, note) VALUES (?,?,?,?,?)")
    .run(req.params.taskId, task.status, "done", completed_by_user_id ?? null, note ?? null);

  ok(res, formatTask(db.prepare("SELECT * FROM hk_tasks WHERE id = ?").get(req.params.taskId)));
});

router.get("/tasks/:taskId/events", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare("SELECT * FROM hk_task_events WHERE task_id = ? ORDER BY created_at").all(req.params.taskId));
});

// ── Maintenance issues ────────────────────────────────────────────────────

router.get("/maintenance-issues", (req: Request, res: Response) => {
  const db = getDb();
  const location_id = Array.isArray(req.query.location_id) ? req.query.location_id[0] : req.query.location_id;
  const status = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;

  let sql = "SELECT * FROM maintenance_issues WHERE 1=1";
  const params: any[] = [];
  if (location_id) { sql += " AND location_id = ?"; params.push(location_id); }
  if (status) { sql += " AND status = ?"; params.push(status); }
  sql += " ORDER BY reported_at DESC";
  ok(res, db.prepare(sql).all(...params));
});

router.post("/maintenance-issues", (req: Request, res: Response) => {
  const { location_id, room_id, issue_type = "general", title, description, severity = "normal" } = req.body;
  if (!location_id || !title) return badRequest(res, "location_id, title required");
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO maintenance_issues (location_id, room_id, issue_type, title, description, severity) VALUES (?,?,?,?,?,?)"
  ).run(location_id, room_id ?? null, issue_type, title, description ?? null, severity);
  ok(res, db.prepare("SELECT * FROM maintenance_issues WHERE id = ?").get(result.lastInsertRowid), 201);
});

router.patch("/maintenance-issues/:issueId", (req: Request, res: Response) => {
  const db = getDb();
  const issue = db.prepare("SELECT * FROM maintenance_issues WHERE id = ?").get(req.params.issueId) as any;
  if (!issue) return notFound(res, "Issue not found");

  const { status, severity, assigned_user_id, title, description } = req.body;
  const updates: string[] = ["updated_at = ?"];
  const params: any[] = [now()];

  if (status !== undefined) {
    updates.push("status = ?"); params.push(status);
    if (status === "resolved") { updates.push("resolved_at = ?"); params.push(now()); }
  }
  if (severity !== undefined) { updates.push("severity = ?"); params.push(severity); }
  if (assigned_user_id !== undefined) { updates.push("assigned_user_id = ?"); params.push(assigned_user_id); }
  if (title !== undefined) { updates.push("title = ?"); params.push(title); }
  if (description !== undefined) { updates.push("description = ?"); params.push(description); }

  params.push(req.params.issueId);
  db.prepare(`UPDATE maintenance_issues SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  ok(res, db.prepare("SELECT * FROM maintenance_issues WHERE id = ?").get(req.params.issueId));
});

// ── Dashboard boards ──────────────────────────────────────────────────────

router.get("/dashboard/room-board-summary", (req: Request, res: Response) => {
  const db = getDb();
  const location_id = Array.isArray(req.query.location_id) ? req.query.location_id[0] : req.query.location_id;

  if (!location_id) return badRequest(res, "location_id required");

  const rooms = db.prepare("SELECT housekeeping_status, occupancy_status, inspection_status FROM hk_rooms WHERE location_id = ? AND is_active = 1").all(location_id) as any[];
  const tasks = db.prepare("SELECT status FROM hk_tasks WHERE location_id = ?").all(location_id) as any[];
  const issues = db.prepare("SELECT status FROM maintenance_issues WHERE location_id = ?").all(location_id) as any[];

  const counts = (arr: any[], key: string) =>
    arr.reduce((acc: Record<string, number>, r: any) => {
      acc[r[key]] = (acc[r[key]] || 0) + 1;
      return acc;
    }, {});

  const hkCounts = counts(rooms, "housekeeping_status");
  const taskCounts = counts(tasks, "status");

  ok(res, {
    total_rooms:          rooms.length,
    dirty:                hkCounts["dirty"] || 0,
    assigned:             hkCounts["assigned"] || 0,
    cleaning:             hkCounts["cleaning"] || 0,
    clean:                hkCounts["clean"] || 0,
    inspect:              hkCounts["inspect"] || 0,
    inspected:            hkCounts["inspected"] || 0,
    blocked:              hkCounts["blocked"] || 0,
    open_tasks:           (taskCounts["open"] || 0) + (taskCounts["assigned"] || 0) + (taskCounts["in_progress"] || 0),
    blocked_tasks:        taskCounts["blocked"] || 0,
    completed_tasks_today: taskCounts["done"] || 0,
    unresolved_issues:    issues.filter((i: any) => !["resolved", "closed"].includes(i.status)).length,
  });
});

router.get("/dashboard/housekeeping-board", (req: Request, res: Response) => {
  const db = getDb();
  const location_id = Array.isArray(req.query.location_id) ? req.query.location_id[0] : req.query.location_id;

  if (!location_id) return badRequest(res, "location_id required");

  const tasks = db.prepare(`
    SELECT t.*, r.room_number
    FROM hk_tasks t
    LEFT JOIN hk_rooms r ON r.id = t.room_id
    WHERE t.location_id = ? AND t.status NOT IN ('done', 'cancelled')
    ORDER BY t.priority DESC, t.created_at ASC
  `).all(location_id) as any[];

  ok(res, tasks.map(t => ({
    id: t.id,
    room_id: t.room_id,
    room_number: t.room_number ?? null,
    task_type: t.task_type,
    title: t.title,
    priority: t.priority,
    status: t.status,
    assigned_user_id: t.assigned_user_id,
    due_at: t.due_at,
  })));
});

// ── Assignments (derived from shift_assignees) ─────────────────────────────

router.get("/assignments/", (req: Request, res: Response) => {
  const db = getDb();
  const location_id = Array.isArray(req.query.location_id) ? req.query.location_id[0] : req.query.location_id;
  const skip = Number(Array.isArray(req.query.skip) ? req.query.skip[0] : req.query.skip ?? "0");
  const limit = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit ?? "100");


  let query = `
    SELECT
      (sa.shift_id || '-' || sa.user_id) AS id,
      sa.shift_id,
      sa.user_id        AS employee_id,
      (ls.first_name || ' ' || ls.last_name) AS employee_name,
      s.role,
      s.status,
      sa.assigned_at    AS created_at
    FROM shift_assignees sa
    JOIN shifts s ON s.id = sa.shift_id
    LEFT JOIN local_staff ls ON ls.id = sa.user_id
  `;

  const params: unknown[] = [];
  if (location_id) {
    query += " WHERE s.location_id = ?";
    params.push(location_id);
  }
  query += ` ORDER BY sa.assigned_at DESC LIMIT ? OFFSET ?`;
  params.push(+limit, +skip);

  const rows = db.prepare(query).all(...params) as any[];
  ok(res, rows);
});

router.get("/dashboard/maintenance-board", (req: Request, res: Response) => {
  const db = getDb();
  const location_id = Array.isArray(req.query.location_id) ? req.query.location_id[0] : req.query.location_id;

  if (!location_id) return badRequest(res, "location_id required");

  const issues = db.prepare(`
    SELECT i.*, r.room_number
    FROM maintenance_issues i
    LEFT JOIN hk_rooms r ON r.id = i.room_id
    WHERE i.location_id = ? AND i.status NOT IN ('resolved', 'closed')
    ORDER BY i.reported_at DESC
  `).all(location_id) as any[];

  ok(res, issues.map(i => ({
    id: i.id,
    room_id: i.room_id,
    room_number: i.room_number ?? null,
    issue_type: i.issue_type,
    title: i.title,
    severity: i.severity,
    status: i.status,
    assigned_user_id: i.assigned_user_id,
    reported_at: i.reported_at,
  })));
});

export default router;
