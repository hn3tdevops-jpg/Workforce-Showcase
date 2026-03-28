import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scryptSync, randomBytes } from "node:crypto";

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
    CREATE TABLE IF NOT EXISTS local_credential_overrides (
      email       TEXT PRIMARY KEY,
      pwd_hash    TEXT NOT NULL,
      user_json   TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS local_sessions (
      token       TEXT PRIMARY KEY,
      email       TEXT NOT NULL,
      user_json   TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

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
      pet_policy          TEXT    NOT NULL DEFAULT 'standard',
      smoking_status      TEXT    NOT NULL DEFAULT 'non_smoking',
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

    CREATE TABLE IF NOT EXISTS local_locations (
      id          TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name        TEXT NOT NULL,
      address     TEXT,
      timezone    TEXT NOT NULL DEFAULT 'America/New_York',
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS local_staff (
      id          TEXT PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      first_name  TEXT NOT NULL,
      last_name   TEXT NOT NULL,
      job_title   TEXT,
      role        TEXT NOT NULL DEFAULT 'staff',
      phone       TEXT,
      hire_date   TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id          TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      title       TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'housekeeping',
      date        TEXT NOT NULL,
      start_time  TEXT NOT NULL,
      end_time    TEXT NOT NULL,
      capacity    INTEGER NOT NULL DEFAULT 1,
      status      TEXT NOT NULL DEFAULT 'open',
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shift_assignees (
      shift_id    TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (shift_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS swap_requests (
      id               TEXT PRIMARY KEY,
      shift_id         TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
      requester_id     TEXT NOT NULL,
      target_user_id   TEXT,
      status           TEXT NOT NULL DEFAULT 'pending',
      message          TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at      TEXT
    );

    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id                  TEXT PRIMARY KEY,
      shift_id            TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
      posted_by_user_id   TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'open',
      bonus_usd           REAL,
      note                TEXT,
      claimed_by_user_id  TEXT,
      posted_at           TEXT NOT NULL DEFAULT (datetime('now')),
      claimed_at          TEXT
    );

    CREATE TABLE IF NOT EXISTS business_settings (
      business_id     TEXT PRIMARY KEY,
      display_name    TEXT,
      logo_url        TEXT,
      primary_color   TEXT NOT NULL DEFAULT '#6366f1',
      accent_color    TEXT NOT NULL DEFAULT '#14b8a6',
      enabled_modules TEXT NOT NULL DEFAULT '["dashboard","rooms","property-map","tasks","assignments","shifts","timeline","users","session"]',
      custom_labels   TEXT NOT NULL DEFAULT '{}',
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id              TEXT PRIMARY KEY,
      theme                TEXT NOT NULL DEFAULT 'dark',
      default_location_id  TEXT,
      sidebar_compact      INTEGER NOT NULL DEFAULT 0,
      density              TEXT NOT NULL DEFAULT 'comfortable',
      updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS studio_projects (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      business_id TEXT,
      location_id TEXT,
      scope_type  TEXT NOT NULL DEFAULT 'BUSINESS',
      title       TEXT NOT NULL,
      summary     TEXT,
      domain_type TEXT,
      status      TEXT NOT NULL DEFAULT 'ACTIVE',
      created_by  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS studio_sessions (
      id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      title      TEXT,
      mode       TEXT NOT NULL DEFAULT 'EXPLORE',
      started_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS studio_messages (
      id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      session_id TEXT NOT NULL REFERENCES studio_sessions(id) ON DELETE CASCADE,
      role       TEXT NOT NULL DEFAULT 'USER',
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS studio_notes (
      id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id        TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      note_type         TEXT NOT NULL DEFAULT 'SUMMARY',
      title             TEXT NOT NULL,
      body              TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'INFERRED',
      source_message_id TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS studio_requirements (
      id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id        TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      requirement_type  TEXT NOT NULL DEFAULT 'FUNCTIONAL',
      priority          TEXT NOT NULL DEFAULT 'MEDIUM',
      statement         TEXT NOT NULL,
      rationale         TEXT,
      status            TEXT NOT NULL DEFAULT 'DRAFT',
      source_message_id TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS studio_decisions (
      id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id     TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      title          TEXT NOT NULL,
      decision_text  TEXT NOT NULL,
      rationale      TEXT,
      decided_by     TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS studio_open_questions (
      id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id      TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      question        TEXT NOT NULL,
      why_it_matters  TEXT,
      severity        TEXT NOT NULL DEFAULT 'MEDIUM',
      resolved_at     TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS studio_entities (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id  TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      description TEXT,
      attributes  TEXT NOT NULL DEFAULT '[]',
      status      TEXT NOT NULL DEFAULT 'INFERRED',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id, name)
    );

    CREATE TABLE IF NOT EXISTS studio_workflows (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id  TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      description TEXT,
      steps       TEXT NOT NULL DEFAULT '[]',
      status      TEXT NOT NULL DEFAULT 'INFERRED',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id, name)
    );

    CREATE TABLE IF NOT EXISTS studio_views (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id  TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      view_type   TEXT NOT NULL DEFAULT 'LIST',
      description TEXT,
      status      TEXT NOT NULL DEFAULT 'INFERRED',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id, name)
    );

    CREATE TABLE IF NOT EXISTS studio_concepts (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id  TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      definition  TEXT,
      status      TEXT NOT NULL DEFAULT 'INFERRED',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id, name)
    );

    CREATE TABLE IF NOT EXISTS studio_relationships (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id  TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      from_name   TEXT NOT NULL,
      from_type   TEXT NOT NULL DEFAULT 'ENTITY',
      to_name     TEXT NOT NULL,
      to_type     TEXT NOT NULL DEFAULT 'ENTITY',
      relation    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'INFERRED',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id, from_name, to_name, relation)
    );

    CREATE TABLE IF NOT EXISTS studio_validations (
      id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id   TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      rule_id      TEXT NOT NULL,
      severity     TEXT NOT NULL DEFAULT 'MEDIUM',
      category     TEXT NOT NULL DEFAULT 'MODEL',
      title        TEXT NOT NULL,
      detail       TEXT,
      subject_id   TEXT,
      subject_type TEXT,
      status       TEXT NOT NULL DEFAULT 'OPEN',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id, rule_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS studio_artifacts (
      id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      project_id    TEXT NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
      artifact_type TEXT NOT NULL,
      label         TEXT NOT NULL,
      content       TEXT NOT NULL,
      word_count    INTEGER NOT NULL DEFAULT 0,
      generated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id, artifact_type)
    );

  `);
}

const STARTER_ASSETS = [
  { asset_type: "tv",          asset_name: "Television",      qty: 1 },
  { asset_type: "fridge",      asset_name: "Mini Fridge",     qty: 1 },
  { asset_type: "microwave",   asset_name: "Microwave",       qty: 1 },
  { asset_type: "coffee_maker",asset_name: "Coffee Maker",    qty: 1 },
  { asset_type: "hvac",        asset_name: "Heater / AC Unit",qty: 1 },
];

const STARTER_SUPPLY_PARS = [
  { item_code: "towel_bath",   item_name: "Bath Towels",    expected_qty: 4, min_qty: 2, unit: "ea" },
  { item_code: "towel_hand",   item_name: "Hand Towels",    expected_qty: 4, min_qty: 2, unit: "ea" },
  { item_code: "towel_wash",   item_name: "Washcloths",     expected_qty: 4, min_qty: 2, unit: "ea" },
  { item_code: "sheet_flat",   item_name: "Flat Sheets",    expected_qty: 2, min_qty: 1, unit: "ea" },
  { item_code: "sheet_fitted", item_name: "Fitted Sheets",  expected_qty: 2, min_qty: 1, unit: "ea" },
  { item_code: "pillowcase",   item_name: "Pillowcases",    expected_qty: 4, min_qty: 2, unit: "ea" },
  { item_code: "blanket",      item_name: "Blankets",       expected_qty: 2, min_qty: 1, unit: "ea" },
  { item_code: "trash_bag",    item_name: "Trash Bags",     expected_qty: 3, min_qty: 1, unit: "ea" },
  { item_code: "soap_bar",     item_name: "Bar Soap",       expected_qty: 4, min_qty: 2, unit: "ea" },
  { item_code: "shampoo",      item_name: "Shampoo",        expected_qty: 2, min_qty: 1, unit: "bottle" },
];

const LOCATION_ID = "loc-001";

// ─── Room data from Silver Sands Motel Room Map ────────────────────────────
// Columns: num, bedType, petPolicy, hkStatus, assignedWorker, maintenanceFlag
// hkStatus: clean | dirty | assigned | cleaning | inspect | inspected | blocked
// petPolicy: standard | no_pets
type RoomSeed = {
  num: string;
  bedType: string;       // K | Q | QQ | QQQ
  petPolicy: string;     // standard | no_pets
  hkStatus: string;
  assignedWorker?: string;
  maintenanceFlag?: string;
};

function bedLabel(type: string): string {
  switch (type) {
    case "K":   return "1 King";
    case "Q":   return "1 Queen";
    case "QQ":  return "2 Queens";
    case "QQQ": return "3 Queens";
    default:    return type;
  }
}

function bedCount(type: string): number {
  switch (type) { case "QQQ": return 3; case "QQ": return 2; default: return 1; }
}

function roomType(type: string): string {
  switch (type) {
    case "K":   return "King Standard";
    case "Q":   return "Queen Standard";
    case "QQ":  return "Double Queen";
    case "QQQ": return "Triple Queen";
    default:    return type;
  }
}

// Building 1 · Floor 1  (rooms 1–12)
const B1F1: RoomSeed[] = [
  { num: "1",  bedType: "K",  petPolicy: "standard", hkStatus: "dirty",    maintenanceFlag: "plumbing" },
  { num: "2",  bedType: "QQ", petPolicy: "standard", hkStatus: "dirty" },
  { num: "3",  bedType: "QQ", petPolicy: "standard", hkStatus: "dirty" },
  { num: "4",  bedType: "K",  petPolicy: "standard", hkStatus: "dirty" },
  { num: "5",  bedType: "K",  petPolicy: "standard", hkStatus: "dirty" },
  { num: "6",  bedType: "K",  petPolicy: "standard", hkStatus: "clean",    assignedWorker: "Unassigned" },
  { num: "7",  bedType: "K",  petPolicy: "standard", hkStatus: "dirty" },
  { num: "8",  bedType: "Q",  petPolicy: "standard", hkStatus: "dirty" },
  { num: "9",  bedType: "Q",  petPolicy: "standard", hkStatus: "dirty" },
  { num: "10", bedType: "Q",  petPolicy: "standard", hkStatus: "clean",    assignedWorker: "Unassigned" },
  { num: "11", bedType: "K",  petPolicy: "standard", hkStatus: "dirty" },
  { num: "12", bedType: "Q",  petPolicy: "standard", hkStatus: "dirty" },
];

// Building 1 · Floor 2  (rooms 14–33, no room 13)
const B1F2: RoomSeed[] = [
  { num: "14", bedType: "QQQ", petPolicy: "standard", hkStatus: "dirty" },
  { num: "15", bedType: "Q",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "16", bedType: "K",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "17", bedType: "Q",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "18", bedType: "Q",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "19", bedType: "QQ",  petPolicy: "standard", hkStatus: "dirty" },
  { num: "20", bedType: "QQ",  petPolicy: "standard", hkStatus: "dirty" },
  { num: "21", bedType: "QQ",  petPolicy: "standard", hkStatus: "dirty" },
  { num: "22", bedType: "QQ",  petPolicy: "standard", hkStatus: "dirty" },
  { num: "23", bedType: "QQ",  petPolicy: "standard", hkStatus: "dirty" },
  { num: "24", bedType: "K",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "25", bedType: "Q",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "26", bedType: "Q",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "27", bedType: "Q",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "28", bedType: "Q",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "29", bedType: "Q",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "30", bedType: "Q",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "31", bedType: "Q",   petPolicy: "standard", hkStatus: "clean",   assignedWorker: "Unassigned" },
  { num: "32", bedType: "Q",   petPolicy: "standard", hkStatus: "dirty" },
  { num: "33", bedType: "QQQ", petPolicy: "standard", hkStatus: "dirty" },
];

// Building 2 · Floor 1  (rooms 50–58)
const B2F1: RoomSeed[] = [
  { num: "50", bedType: "QQ", petPolicy: "standard", hkStatus: "dirty" },
  { num: "51", bedType: "QQ", petPolicy: "standard", hkStatus: "dirty" },
  { num: "52", bedType: "QQ", petPolicy: "standard", hkStatus: "clean",   assignedWorker: "Robert Garrett" },
  { num: "53", bedType: "QQ", petPolicy: "standard", hkStatus: "dirty" },
  { num: "54", bedType: "K",  petPolicy: "standard", hkStatus: "clean",   assignedWorker: "Robert Garrett" },
  { num: "55", bedType: "QQ", petPolicy: "standard", hkStatus: "dirty" },
  { num: "56", bedType: "QQ", petPolicy: "standard", hkStatus: "dirty" },
  { num: "57", bedType: "QQ", petPolicy: "standard", hkStatus: "dirty" },
  { num: "58", bedType: "QQ", petPolicy: "standard", hkStatus: "dirty" },
];

// Building 2 · Floor 2  (rooms 60–68, No Pets wing)
const B2F2: RoomSeed[] = [
  { num: "60", bedType: "K",  petPolicy: "no_pets", hkStatus: "dirty" },
  { num: "61", bedType: "QQ", petPolicy: "no_pets", hkStatus: "clean",   assignedWorker: "Robert Garrett" },
  { num: "62", bedType: "QQ", petPolicy: "no_pets", hkStatus: "dirty" },
  { num: "63", bedType: "QQ", petPolicy: "no_pets", hkStatus: "dirty" },
  { num: "64", bedType: "QQ", petPolicy: "no_pets", hkStatus: "clean",   assignedWorker: "Robert Garrett" },
  { num: "65", bedType: "QQ", petPolicy: "no_pets", hkStatus: "dirty" },
  { num: "66", bedType: "QQ", petPolicy: "no_pets", hkStatus: "dirty" },
  { num: "67", bedType: "QQ", petPolicy: "no_pets", hkStatus: "dirty" },
  { num: "68", bedType: "QQ", petPolicy: "no_pets", hkStatus: "dirty" },
];

function seedIfEmpty(db: Database.Database): void {
  // ── Migration: ensure "studio" is in enabled_modules for all business settings ──
  const settingsRows = db.prepare("SELECT business_id, enabled_modules FROM business_settings").all() as { business_id: string; enabled_modules: string }[];
  for (const row of settingsRows) {
    try {
      const mods: string[] = JSON.parse(row.enabled_modules);
      if (!mods.includes("studio")) {
        const idx = mods.indexOf("session");
        if (idx >= 0) mods.splice(idx, 0, "studio");
        else mods.push("studio");
        db.prepare("UPDATE business_settings SET enabled_modules = ? WHERE business_id = ?").run(JSON.stringify(mods), row.business_id);
      }
    } catch { /* ignore parse errors */ }
  }

  // ── Seed locations ────────────────────────────────────────────────────────
  const locCount = (db.prepare("SELECT COUNT(*) as n FROM local_locations").get() as { n: number }).n;
  if (locCount === 0) {
    const ins = db.prepare(
      "INSERT OR IGNORE INTO local_locations (id, business_id, name, address, timezone) VALUES (?, ?, ?, ?, ?)"
    );
    ins.run("loc-001", "biz-silver-sands", "Silver Sands Motel",   "12 Ocean Drive",        "America/New_York");
    ins.run("loc-002", "biz-silver-sands", "Silver Sands Pool Wing","12 Ocean Drive (West)", "America/New_York");
  }

  // ── Seed staff ────────────────────────────────────────────────────────────
  const staffCount = (db.prepare("SELECT COUNT(*) as n FROM local_staff").get() as { n: number }).n;
  if (staffCount === 0) {
    const ins = db.prepare(
      "INSERT OR IGNORE INTO local_staff (id, email, first_name, last_name, job_title, role, phone) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    ins.run("user-001", "manager@silversands.com",    "Sarah",  "Okonkwo", "General Manager",        "owner",      "+1 555 001 0001");
    ins.run("user-002", "front.desk@silversands.com", "Marcus", "Yee",     "Front Desk Supervisor",  "supervisor", "+1 555 001 0002");
    ins.run("user-003", "hk.lead@silversands.com",    "Amara",  "Singh",   "Housekeeping Lead",      "supervisor", "+1 555 001 0003");
    ins.run("user-004", "hk.01@silversands.com",      "James",  "Boateng", "Housekeeper",            "staff",      null);
    ins.run("user-005", "hk.02@silversands.com",      "Priya",  "Nair",    "Housekeeper",            "staff",      null);
    ins.run("user-006", "maintenance@silversands.com","Derek",  "Walsh",   "Maintenance Technician", "staff",      null);
  }

  // ── Seed local login credentials (INSERT OR IGNORE — never overwrites manual resets) ──
  const SEED_CREDS = [
    { id: "user-001", email: "manager@silversands.com",    firstName: "Sarah",  lastName: "Okonkwo", role: "owner",      roles: ["owner"],      perms: ["*"] },
    { id: "user-002", email: "front.desk@silversands.com", firstName: "Marcus", lastName: "Yee",     role: "supervisor", roles: ["supervisor"], perms: ["rooms:write","tasks:write","staff:read"] },
    { id: "user-003", email: "hk.lead@silversands.com",    firstName: "Amara",  lastName: "Singh",   role: "supervisor", roles: ["supervisor"], perms: ["rooms:write","tasks:write","staff:read"] },
    { id: "user-004", email: "hk.01@silversands.com",      firstName: "James",  lastName: "Boateng", role: "staff",      roles: ["staff"],      perms: ["tasks:read","tasks:write:own"] },
    { id: "user-005", email: "hk.02@silversands.com",      firstName: "Priya",  lastName: "Nair",    role: "staff",      roles: ["staff"],      perms: ["tasks:read","tasks:write:own"] },
    { id: "user-006", email: "maintenance@silversands.com",firstName: "Derek",  lastName: "Walsh",   role: "staff",      roles: ["staff"],      perms: ["tasks:read","tasks:write:own"] },
  ];
  const DEFAULT_PWD = "SilverSands2025!";
  const insertCred = db.prepare(
    "INSERT OR IGNORE INTO local_credential_overrides (email, pwd_hash, user_json) VALUES (?, ?, ?)"
  );
  for (const u of SEED_CREDS) {
    const already = db.prepare(
      "SELECT email FROM local_credential_overrides WHERE email = ?"
    ).get(u.email);
    if (!already) {
      const salt = randomBytes(16).toString("hex");
      const hash = scryptSync(DEFAULT_PWD, salt, 64).toString("hex");
      const userJson = JSON.stringify({
        id: u.id,
        email: u.email,
        first_name: u.firstName,
        last_name: u.lastName,
        is_active: true,
        business_id: "biz-silver-sands",
        memberships: [{
          business_id: "biz-silver-sands",
          business_name: "Silver Sands Motel",
          role: u.role,
        }],
        roles: u.roles,
        permissions: u.perms,
      });
      insertCred.run(u.email, `${salt}:${hash}`, userJson);
    }
  }

  const existing = db.prepare("SELECT COUNT(*) as count FROM property_buildings").get() as { count: number };
  if (existing.count > 0) return;

  const insertBuilding = db.prepare(
    "INSERT INTO property_buildings (location_id, code, name, sort_order) VALUES (?, ?, ?, ?)"
  );
  const insertFloor = db.prepare(
    "INSERT INTO property_floors (building_id, floor_number, label, sort_order) VALUES (?, ?, ?, ?)"
  );
  const insertRoom = db.prepare(`
    INSERT INTO hk_rooms
      (location_id, building_id, floor_id, room_number, room_type,
       bed_count, bed_type_summary, housekeeping_status, occupancy_status,
       inspection_status, pet_policy, smoking_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'non_smoking')
  `);
  const insertAsset = db.prepare(
    "INSERT INTO hk_room_assets (room_id, asset_type, asset_name, quantity_expected, quantity_present) VALUES (?, ?, ?, ?, ?)"
  );
  const insertSupply = db.prepare(
    "INSERT INTO hk_room_supply_pars (room_id, item_code, item_name, expected_qty, min_qty, unit) VALUES (?, ?, ?, ?, ?, ?)"
  );

  function seedFloor(buildingId: number, floorNum: number, label: string, sort: number, rooms: RoomSeed[]): void {
    const floorId = (insertFloor.run(buildingId, floorNum, label, sort)).lastInsertRowid as number;
    for (const r of rooms) {
      const hkStatus = r.hkStatus;
      const occStatus = hkStatus === "dirty" ? "checkout" : "vacant";
      const inspStatus = hkStatus === "inspect" ? "pending" : "not_required";

      const roomId = (insertRoom.run(
        LOCATION_ID, buildingId, floorId,
        r.num, roomType(r.bedType),
        bedCount(r.bedType), bedLabel(r.bedType),
        hkStatus, occStatus, inspStatus, r.petPolicy
      )).lastInsertRowid as number;

      for (const a of STARTER_ASSETS) {
        insertAsset.run(roomId, a.asset_type, a.asset_name, a.qty, a.qty);
      }
      for (const s of STARTER_SUPPLY_PARS) {
        insertSupply.run(roomId, s.item_code, s.item_name, s.expected_qty, s.min_qty, s.unit);
      }
    }
  }

  const b1Id = (insertBuilding.run(LOCATION_ID, "B1", "Building 1", 0)).lastInsertRowid as number;
  seedFloor(b1Id, 1, "Floor 1", 0, B1F1);
  seedFloor(b1Id, 2, "Floor 2", 1, B1F2);

  const b2Id = (insertBuilding.run(LOCATION_ID, "B2", "Building 2", 1)).lastInsertRowid as number;
  seedFloor(b2Id, 1, "Floor 1", 0, B2F1);
  seedFloor(b2Id, 2, "Floor 2 – No Pets", 1, B2F2);

  // ── Seed starter tasks for dirty rooms needing attention ──────────────────
  const insertTask = db.prepare(`
    INSERT INTO hk_tasks (location_id, room_id, task_type, title, priority, status, assigned_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const rooms = db.prepare(
    "SELECT id, room_number, housekeeping_status FROM hk_rooms WHERE location_id = ?"
  ).all(LOCATION_ID) as Array<{ id: number; room_number: string; housekeeping_status: string }>;

  const dirtyRooms = rooms.filter(r => r.housekeeping_status === "dirty").slice(0, 12);
  for (const r of dirtyRooms) {
    insertTask.run(
      LOCATION_ID, r.id, "clean_checkout",
      `Checkout Clean – Room ${r.room_number}`,
      "normal", "open", null
    );
  }

  // Assigned-worker rooms get "assigned" tasks
  const robertRooms = [...B2F1, ...B2F2].filter(r => r.assignedWorker === "Robert Garrett");
  for (const r of robertRooms) {
    const found = rooms.find(x => x.room_number === r.num);
    if (found) {
      insertTask.run(
        LOCATION_ID, found.id, "inspection",
        `Inspection – Room ${r.num}`,
        "normal", "assigned", "user-robert-garrett"
      );
    }
  }

  // ── Seed maintenance issues ───────────────────────────────────────────────
  const insertIssue = db.prepare(`
    INSERT INTO maintenance_issues (location_id, room_id, issue_type, title, severity, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const roomMap = Object.fromEntries(rooms.map(r => [r.room_number, r.id]));

  insertIssue.run(LOCATION_ID, roomMap["1"],  "plumbing",   "Shower leaking – Room 1",         "high",   "open");
  insertIssue.run(LOCATION_ID, roomMap["14"], "electrical", "Bathroom light flickering – R14",  "normal", "triaged");
  insertIssue.run(LOCATION_ID, roomMap["33"], "hvac",       "AC unit not cooling – Room 33",    "normal", "open");
  insertIssue.run(LOCATION_ID, roomMap["50"], "general",    "Door latch stiff – Room 50",       "low",    "open");
  insertIssue.run(LOCATION_ID, roomMap["60"], "plumbing",   "Toilet running – Room 60",         "normal", "open");
}
