import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../../hospitable.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
    seedIfEmpty(_db);
  }
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS property_buildings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT    NOT NULL,
      code        TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (location_id, code)
    );

    CREATE TABLE IF NOT EXISTS property_floors (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      building_id  INTEGER NOT NULL REFERENCES property_buildings(id) ON DELETE CASCADE,
      floor_number INTEGER NOT NULL,
      label        TEXT    NOT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS property_sectors (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      floor_id    INTEGER NOT NULL REFERENCES property_floors(id) ON DELETE CASCADE,
      code        TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      description TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hk_room_groups (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      color       TEXT,
      description TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hk_rooms (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id         TEXT    NOT NULL,
      building_id         INTEGER REFERENCES property_buildings(id),
      floor_id            INTEGER REFERENCES property_floors(id),
      sector_id           INTEGER REFERENCES property_sectors(id),
      room_group_id       INTEGER REFERENCES hk_room_groups(id),
      room_number         TEXT    NOT NULL,
      room_label          TEXT,
      room_type           TEXT,
      bed_count           INTEGER,
      bed_type_summary    TEXT,
      housekeeping_status TEXT    NOT NULL DEFAULT 'dirty',
      occupancy_status    TEXT    NOT NULL DEFAULT 'vacant',
      inspection_status   TEXT    NOT NULL DEFAULT 'not_required',
      maintenance_status  TEXT    NOT NULL DEFAULT 'ok',
      notes               TEXT,
      last_cleaned_at     TEXT,
      last_inspected_at   TEXT,
      is_active           INTEGER NOT NULL DEFAULT 1,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hk_room_assets (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id           INTEGER NOT NULL REFERENCES hk_rooms(id) ON DELETE CASCADE,
      asset_type        TEXT    NOT NULL,
      asset_name        TEXT    NOT NULL,
      quantity_expected INTEGER NOT NULL DEFAULT 1,
      quantity_present  INTEGER NOT NULL DEFAULT 1,
      condition_status  TEXT    NOT NULL DEFAULT 'ok',
      maintenance_notes TEXT,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hk_room_supply_pars (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id      INTEGER NOT NULL REFERENCES hk_rooms(id) ON DELETE CASCADE,
      item_code    TEXT    NOT NULL,
      item_name    TEXT    NOT NULL,
      expected_qty INTEGER NOT NULL,
      min_qty      INTEGER NOT NULL,
      unit         TEXT    NOT NULL DEFAULT 'ea',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hk_tasks (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id         TEXT    NOT NULL,
      room_id             INTEGER REFERENCES hk_rooms(id),
      task_type           TEXT    NOT NULL DEFAULT 'clean_checkout',
      title               TEXT    NOT NULL,
      description         TEXT,
      priority            TEXT    NOT NULL DEFAULT 'normal',
      status              TEXT    NOT NULL DEFAULT 'open',
      assigned_user_id    TEXT,
      due_at              TEXT,
      completed_at        TEXT,
      created_by_user_id  TEXT,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hk_task_events (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id           INTEGER NOT NULL REFERENCES hk_tasks(id) ON DELETE CASCADE,
      old_status        TEXT,
      new_status        TEXT    NOT NULL,
      changed_by_user_id TEXT,
      note              TEXT,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS maintenance_issues (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id      TEXT    NOT NULL,
      room_id          INTEGER REFERENCES hk_rooms(id),
      issue_type       TEXT    NOT NULL DEFAULT 'general',
      title            TEXT    NOT NULL,
      description      TEXT,
      severity         TEXT    NOT NULL DEFAULT 'normal',
      status           TEXT    NOT NULL DEFAULT 'open',
      assigned_user_id TEXT,
      reported_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      resolved_at      TEXT,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

const STARTER_ASSETS = [
  { asset_type: "tv", asset_name: "Television", quantity_expected: 1, quantity_present: 1 },
  { asset_type: "fridge", asset_name: "Mini Fridge", quantity_expected: 1, quantity_present: 1 },
  { asset_type: "microwave", asset_name: "Microwave", quantity_expected: 1, quantity_present: 1 },
  { asset_type: "coffee_maker", asset_name: "Coffee Maker", quantity_expected: 1, quantity_present: 1 },
  { asset_type: "hvac", asset_name: "Heater / AC Unit", quantity_expected: 1, quantity_present: 1 },
];

const STARTER_SUPPLY_PARS = [
  { item_code: "towel_bath", item_name: "Bath Towels", expected_qty: 4, min_qty: 2, unit: "ea" },
  { item_code: "towel_hand", item_name: "Hand Towels", expected_qty: 4, min_qty: 2, unit: "ea" },
  { item_code: "towel_wash", item_name: "Washcloths", expected_qty: 4, min_qty: 2, unit: "ea" },
  { item_code: "sheet_flat", item_name: "Flat Sheets", expected_qty: 2, min_qty: 1, unit: "ea" },
  { item_code: "sheet_fitted", item_name: "Fitted Sheets", expected_qty: 2, min_qty: 1, unit: "ea" },
  { item_code: "pillowcase", item_name: "Pillowcases", expected_qty: 4, min_qty: 2, unit: "ea" },
  { item_code: "blanket", item_name: "Blankets", expected_qty: 2, min_qty: 1, unit: "ea" },
  { item_code: "trash_bag", item_name: "Trash Bags", expected_qty: 3, min_qty: 1, unit: "ea" },
  { item_code: "soap_bar", item_name: "Bar Soap", expected_qty: 4, min_qty: 2, unit: "ea" },
  { item_code: "shampoo", item_name: "Shampoo", expected_qty: 2, min_qty: 1, unit: "bottle" },
];

const SILVER_SANDS_LOCATION_ID = "loc-ss-001";

function seedIfEmpty(db: Database.Database): void {
  const existing = db.prepare("SELECT COUNT(*) as count FROM property_buildings").get() as { count: number };
  if (existing.count > 0) return;

  const insertBuilding = db.prepare(
    "INSERT INTO property_buildings (location_id, code, name, sort_order) VALUES (?, ?, ?, ?)"
  );
  const buildingId = (insertBuilding.run(SILVER_SANDS_LOCATION_ID, "B1", "Building 1", 0)).lastInsertRowid as number;

  const insertFloor = db.prepare(
    "INSERT INTO property_floors (building_id, floor_number, label, sort_order) VALUES (?, ?, ?, ?)"
  );
  const floorId = (insertFloor.run(buildingId, 1, "Floor 1", 0)).lastInsertRowid as number;

  const insertSector = db.prepare(
    "INSERT INTO property_sectors (floor_id, code, name, description, sort_order) VALUES (?, ?, ?, ?, ?)"
  );
  const northId = (insertSector.run(floorId, "north", "North Side", "Rooms 7-12 on the north side", 0)).lastInsertRowid as number;
  const southId = (insertSector.run(floorId, "south", "South Side", "Rooms 1-6 on the south side", 1)).lastInsertRowid as number;

  const insertGroup = db.prepare(
    "INSERT INTO hk_room_groups (location_id, name, color, description) VALUES (?, ?, ?, ?)"
  );
  const northGroupId = (insertGroup.run(SILVER_SANDS_LOCATION_ID, "North Group", "#3b82f6", "North side rooms 7-12")).lastInsertRowid as number;
  const southGroupId = (insertGroup.run(SILVER_SANDS_LOCATION_ID, "South Group", "#10b981", "South side rooms 1-6")).lastInsertRowid as number;

  const insertRoom = db.prepare(`
    INSERT INTO hk_rooms
      (location_id, building_id, floor_id, sector_id, room_group_id, room_number, room_type,
       bed_count, bed_type_summary, housekeeping_status, occupancy_status, inspection_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const SOUTH_ROOMS = [
    { num: "1",  type: "Queen Standard", beds: 1, bed_summary: "1 Queen", hk: "clean",      occ: "vacant",   insp: "not_required" },
    { num: "2",  type: "Queen Standard", beds: 1, bed_summary: "1 Queen", hk: "dirty",      occ: "checkout", insp: "not_required" },
    { num: "3",  type: "King Suite",     beds: 1, bed_summary: "1 King",  hk: "cleaning",   occ: "checkout", insp: "not_required" },
    { num: "4",  type: "Queen Standard", beds: 1, bed_summary: "1 Queen", hk: "inspect",    occ: "checkout", insp: "pending" },
    { num: "5",  type: "Queen Standard", beds: 1, bed_summary: "1 Queen", hk: "dirty",      occ: "checkout", insp: "not_required" },
    { num: "6",  type: "Double Room",    beds: 2, bed_summary: "2 Doubles", hk: "blocked",  occ: "ooo",      insp: "not_required" },
  ];

  const NORTH_ROOMS = [
    { num: "7",  type: "Queen Standard", beds: 1, bed_summary: "1 Queen", hk: "dirty",      occ: "checkout", insp: "not_required" },
    { num: "8",  type: "Queen Standard", beds: 1, bed_summary: "1 Queen", hk: "cleaning",   occ: "checkout", insp: "not_required" },
    { num: "9",  type: "King Suite",     beds: 1, bed_summary: "1 King",  hk: "inspected",  occ: "vacant",   insp: "passed" },
    { num: "10", type: "Queen Standard", beds: 1, bed_summary: "1 Queen", hk: "inspect",    occ: "checkout", insp: "pending" },
    { num: "11", type: "Queen Standard", beds: 1, bed_summary: "1 Queen", hk: "dirty",      occ: "checkout", insp: "not_required" },
    { num: "12", type: "Double Room",    beds: 2, bed_summary: "2 Doubles", hk: "dirty",    occ: "checkout", insp: "not_required" },
  ];

  const insertAsset = db.prepare(
    "INSERT INTO hk_room_assets (room_id, asset_type, asset_name, quantity_expected, quantity_present) VALUES (?, ?, ?, ?, ?)"
  );
  const insertSupply = db.prepare(
    "INSERT INTO hk_room_supply_pars (room_id, item_code, item_name, expected_qty, min_qty, unit) VALUES (?, ?, ?, ?, ?, ?)"
  );

  for (const r of SOUTH_ROOMS) {
    const roomId = (insertRoom.run(
      SILVER_SANDS_LOCATION_ID, buildingId, floorId, southId, southGroupId,
      r.num, r.type, r.beds, r.bed_summary, r.hk, r.occ, r.insp
    )).lastInsertRowid as number;
    for (const a of STARTER_ASSETS) insertAsset.run(roomId, a.asset_type, a.asset_name, a.quantity_expected, a.quantity_present);
    for (const s of STARTER_SUPPLY_PARS) insertSupply.run(roomId, s.item_code, s.item_name, s.expected_qty, s.min_qty, s.unit);
  }

  for (const r of NORTH_ROOMS) {
    const roomId = (insertRoom.run(
      SILVER_SANDS_LOCATION_ID, buildingId, floorId, northId, northGroupId,
      r.num, r.type, r.beds, r.bed_summary, r.hk, r.occ, r.insp
    )).lastInsertRowid as number;
    for (const a of STARTER_ASSETS) insertAsset.run(roomId, a.asset_type, a.asset_name, a.quantity_expected, a.quantity_present);
    for (const s of STARTER_SUPPLY_PARS) insertSupply.run(roomId, s.item_code, s.item_name, s.expected_qty, s.min_qty, s.unit);
  }

  const insertTask = db.prepare(`
    INSERT INTO hk_tasks (location_id, room_id, task_type, title, priority, status, assigned_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const rooms = db.prepare("SELECT id, room_number FROM hk_rooms WHERE location_id = ?").all(SILVER_SANDS_LOCATION_ID) as Array<{ id: number; room_number: string }>;
  const roomMap = Object.fromEntries(rooms.map(r => [r.room_number, r.id]));

  insertTask.run(SILVER_SANDS_LOCATION_ID, roomMap["2"], "clean_checkout", "Checkout Clean – Room 2",  "normal", "open",        null);
  insertTask.run(SILVER_SANDS_LOCATION_ID, roomMap["3"], "clean_checkout", "Checkout Clean – Room 3",  "normal", "in_progress", "user-maria");
  insertTask.run(SILVER_SANDS_LOCATION_ID, roomMap["4"], "inspection",     "Inspection – Room 4",       "normal", "assigned",    "user-linda");
  insertTask.run(SILVER_SANDS_LOCATION_ID, roomMap["5"], "clean_checkout", "Checkout Clean – Room 5",  "high",   "open",        null);
  insertTask.run(SILVER_SANDS_LOCATION_ID, roomMap["7"], "clean_checkout", "Checkout Clean – Room 7",  "normal", "open",        null);
  insertTask.run(SILVER_SANDS_LOCATION_ID, roomMap["8"], "clean_stayover", "Stayover Clean – Room 8",  "normal", "in_progress", "user-priya");
  insertTask.run(SILVER_SANDS_LOCATION_ID, roomMap["10"],"inspection",     "Inspection – Room 10",     "normal", "assigned",    "user-linda");
  insertTask.run(SILVER_SANDS_LOCATION_ID, roomMap["11"],"clean_checkout", "Checkout Clean – Room 11", "normal", "open",        null);
  insertTask.run(SILVER_SANDS_LOCATION_ID, roomMap["12"],"clean_checkout", "Checkout Clean – Room 12", "normal", "open",        null);

  const insertIssue = db.prepare(`
    INSERT INTO maintenance_issues (location_id, room_id, issue_type, title, severity, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertIssue.run(SILVER_SANDS_LOCATION_ID, roomMap["6"],  "plumbing",    "Shower leaking – Room 6",       "high",   "open");
  insertIssue.run(SILVER_SANDS_LOCATION_ID, roomMap["11"], "electrical",  "Bathroom light flickering – R11","normal", "triaged");
  insertIssue.run(SILVER_SANDS_LOCATION_ID, roomMap["3"],  "hvac",        "AC unit not cooling – Room 3",  "normal", "open");
}
