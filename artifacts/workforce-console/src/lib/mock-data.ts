/**
 * Mock data for demo mode — Silver Sands Motel.
 * All shapes match the intended live API contract so the adapter swap is transparent.
 * Spec: 1 business, 2 locations, 6 users, 10-20 rooms, 8-12 active tasks, 1 maintenance_hold.
 */

export interface MockLocation {
  id: string;
  name: string;
  business_id: string;
  address?: string;
  is_active: boolean;
}

export interface MockUserMembership {
  business_id: string;
  business_name: string;
  location_id?: string;
  location_name?: string;
  role: string;
  scope: "business" | "location";
  job_title_label?: string;
}

export interface MockUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  job_title?: string;
  phone?: string;
  memberships: MockUserMembership[];
}

// 1 business, 2 locations
export const MOCK_LOCATIONS: MockLocation[] = [
  {
    id: "loc-001",
    name: "Main Building",
    business_id: "biz-001",
    address: "12 Ocean Drive",
    is_active: true,
  },
  {
    id: "loc-002",
    name: "Pool Wing",
    business_id: "biz-001",
    address: "12 Ocean Drive (West)",
    is_active: true,
  },
];

// 6 users
export const MOCK_USERS: MockUser[] = [
  {
    id: "user-001",
    email: "manager@silversands.com",
    first_name: "Sarah",
    last_name: "Okonkwo",
    is_active: true,
    job_title: "General Manager",
    phone: "+1 555 001 0001",
    memberships: [
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        role: "owner",
        scope: "business",
        job_title_label: "General Manager",
      },
    ],
  },
  {
    id: "user-002",
    email: "front.desk@silversands.com",
    first_name: "Marcus",
    last_name: "Yee",
    is_active: true,
    job_title: "Front Desk Supervisor",
    phone: "+1 555 001 0002",
    memberships: [
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        location_id: "loc-001",
        location_name: "Main Building",
        role: "supervisor",
        scope: "location",
        job_title_label: "Front Desk Supervisor",
      },
    ],
  },
  {
    id: "user-003",
    email: "hk.lead@silversands.com",
    first_name: "Amara",
    last_name: "Singh",
    is_active: true,
    job_title: "Housekeeping Lead",
    phone: "+1 555 001 0003",
    memberships: [
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        location_id: "loc-001",
        location_name: "Main Building",
        role: "supervisor",
        scope: "location",
        job_title_label: "Housekeeping Lead",
      },
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        location_id: "loc-002",
        location_name: "Pool Wing",
        role: "member",
        scope: "location",
        job_title_label: "Housekeeping Lead",
      },
    ],
  },
  {
    id: "user-004",
    email: "hk.01@silversands.com",
    first_name: "James",
    last_name: "Boateng",
    is_active: true,
    job_title: "Housekeeper",
    memberships: [
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        location_id: "loc-001",
        location_name: "Main Building",
        role: "member",
        scope: "location",
        job_title_label: "Housekeeper",
      },
    ],
  },
  {
    id: "user-005",
    email: "hk.02@silversands.com",
    first_name: "Priya",
    last_name: "Nair",
    is_active: true,
    job_title: "Housekeeper",
    memberships: [
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        location_id: "loc-002",
        location_name: "Pool Wing",
        role: "member",
        scope: "location",
        job_title_label: "Housekeeper",
      },
    ],
  },
  {
    id: "user-006",
    email: "maintenance@silversands.com",
    first_name: "Derek",
    last_name: "Walsh",
    is_active: true,
    job_title: "Maintenance Technician",
    memberships: [
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        location_id: "loc-001",
        location_name: "Main Building",
        role: "member",
        scope: "location",
        job_title_label: "Maintenance Technician",
      },
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        location_id: "loc-002",
        location_name: "Pool Wing",
        role: "member",
        scope: "location",
        job_title_label: "Maintenance Technician",
      },
    ],
  },
];

// 14 rooms across 2 locations — spec statuses only, 1 maintenance_hold
export const MOCK_ROOMS = [
  // Main Building — loc-001 (9 rooms)
  { id: "room-101", name: "Room 101", room_number: "101", room_type: "standard", status: "clean", floor: "1", location_id: "loc-001", notes: "Ocean view. Recently deep cleaned." },
  { id: "room-102", name: "Room 102", room_number: "102", room_type: "standard", status: "stayover", floor: "1", location_id: "loc-001", notes: "Guest checked in yesterday. DND reported this morning." },
  { id: "room-103", name: "Room 103", room_number: "103", room_type: "standard", status: "dirty", floor: "1", location_id: "loc-001", notes: "Checkout today. Awaiting cleaning." },
  { id: "room-104", name: "Room 104", room_number: "104", room_type: "deluxe", status: "maintenance_hold", floor: "1", location_id: "loc-001", notes: "AC unit requires repair. Do not assign guests." },
  { id: "room-105", name: "Room 105", room_number: "105", room_type: "standard", status: "dnd", floor: "1", location_id: "loc-001", notes: "Do not disturb — long-stay guest." },
  { id: "room-201", name: "Room 201", room_number: "201", room_type: "suite", status: "inspected", floor: "2", location_id: "loc-001", notes: "Premium suite. Passed inspection this morning." },
  { id: "room-202", name: "Room 202", room_number: "202", room_type: "standard", status: "stayover", floor: "2", location_id: "loc-001", notes: "" },
  { id: "room-203", name: "Room 203", room_number: "203", room_type: "standard", status: "ready_for_inspection", floor: "2", location_id: "loc-001", notes: "Cleaned and ready for inspection." },
  { id: "room-204", name: "Room 204", room_number: "204", room_type: "standard", status: "laundry_only", floor: "2", location_id: "loc-001", notes: "Linens collected. Laundry in progress." },
  // Pool Wing — loc-002 (5 rooms)
  { id: "room-p01", name: "Pool 01", room_number: "P01", room_type: "poolside", status: "clean", floor: "G", location_id: "loc-002", notes: "Poolside cabana. Restocked." },
  { id: "room-p02", name: "Pool 02", room_number: "P02", room_type: "poolside", status: "dirty", floor: "G", location_id: "loc-002", notes: "Checkout earlier today." },
  { id: "room-p03", name: "Pool 03", room_number: "P03", room_type: "poolside", status: "stayover", floor: "G", location_id: "loc-002", notes: "" },
  { id: "room-p04", name: "Pool 04", room_number: "P04", room_type: "poolside", status: "ready_for_inspection", floor: "G", location_id: "loc-002", notes: "Cleaned. Waiting on inspector." },
  { id: "room-p05", name: "Pool 05", room_number: "P05", room_type: "poolside", status: "clean", floor: "G", location_id: "loc-002", notes: "" },
];

// 10 tasks — spec statuses: open, assigned, in_progress, completed, blocked, cancelled
export const MOCK_TASKS = [
  { id: "task-001", title: "Clean Room 103", description: "Standard checkout clean. Change all linens.", task_type: "housekeeping", priority: "high", status: "open", due_at: new Date(Date.now() + 1 * 3600000).toISOString(), assigned_user_id: null, location_id: "loc-001", room_id: "room-103" },
  { id: "task-002", title: "Repair AC Unit — Room 104", description: "AC not cooling. Technician required. Room on maintenance hold.", task_type: "maintenance", priority: "high", status: "in_progress", due_at: new Date(Date.now() + 2 * 3600000).toISOString(), assigned_user_id: "user-006", location_id: "loc-001", room_id: "room-104" },
  { id: "task-003", title: "Inspect Room 203", description: "Post-clean inspection before marking ready.", task_type: "inspection", priority: "medium", status: "assigned", due_at: new Date(Date.now() + 0.5 * 3600000).toISOString(), assigned_user_id: "user-003", location_id: "loc-001", room_id: "room-203" },
  { id: "task-004", title: "Restock minibar — Suite 201", description: "Minibar consumption from previous guest. Restock per par list.", task_type: "housekeeping", priority: "low", status: "completed", due_at: new Date(Date.now() - 1 * 3600000).toISOString(), assigned_user_id: "user-004", location_id: "loc-001", room_id: "room-201" },
  { id: "task-005", title: "Clean Pool 02", description: "Pool cabana checkout clean.", task_type: "housekeeping", priority: "medium", status: "open", due_at: new Date(Date.now() + 3 * 3600000).toISOString(), assigned_user_id: null, location_id: "loc-002", room_id: "room-p02" },
  { id: "task-006", title: "Collect linen — Room 204", description: "Linen collected for laundry. Replace with fresh set on return.", task_type: "housekeeping", priority: "medium", status: "in_progress", due_at: new Date(Date.now() + 2 * 3600000).toISOString(), assigned_user_id: "user-005", location_id: "loc-002", room_id: "room-p02" },
  { id: "task-007", title: "Smoke detectors — Floor 2", description: "Quarterly smoke detector test for Floor 2 rooms.", task_type: "safety", priority: "high", status: "open", due_at: new Date(Date.now() + 6 * 3600000).toISOString(), assigned_user_id: null, location_id: "loc-001", room_id: null },
  { id: "task-008", title: "Inspect Pool 04", description: "Post-clean inspection for Pool 04 before guest check-in.", task_type: "inspection", priority: "medium", status: "assigned", due_at: new Date(Date.now() + 1 * 3600000).toISOString(), assigned_user_id: "user-003", location_id: "loc-002", room_id: "room-p04" },
  { id: "task-009", title: "Welcome pack — Room 201", description: "VIP arrival cancelled. Welcome pack not needed.", task_type: "concierge", priority: "high", status: "cancelled", due_at: new Date(Date.now() - 5 * 3600000).toISOString(), assigned_user_id: "user-002", location_id: "loc-001", room_id: "room-201" },
  { id: "task-010", title: "Fix towel rail — Room 105", description: "Guest reported loose towel rail. Awaiting spare part from supplier.", task_type: "maintenance", priority: "medium", status: "blocked", due_at: new Date(Date.now() + 24 * 3600000).toISOString(), assigned_user_id: "user-006", location_id: "loc-001", room_id: "room-105" },
];

// ── Scheduling types ─────────────────────────────────────────────────────────

export type ShiftRole = "housekeeping" | "front_desk" | "maintenance" | "supervisor" | "concierge";
export type ShiftStatus = "open" | "partial" | "filled" | "draft" | "cancelled" | "in_progress" | "completed";

export interface MockShift {
  id: string;
  title: string;
  role: ShiftRole;
  date: string;        // "YYYY-MM-DD"
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
  location_id: string;
  assignee_ids: string[];
  capacity: number;
  status: ShiftStatus;
  notes?: string;
}

export type SwapStatus = "pending" | "accepted" | "approved" | "denied" | "withdrawn";

export interface MockSwapRequest {
  id: string;
  shift_id: string;
  requester_id: string;
  target_user_id: string | null; // null = open offer (anyone can accept)
  status: SwapStatus;
  message?: string;
  created_at: string;
  resolved_at?: string;
}

export type MarketplaceStatus = "open" | "claimed" | "expired" | "cancelled";

export interface MockMarketplaceListing {
  id: string;
  shift_id: string;
  posted_by_user_id: string;
  posted_at: string;
  status: MarketplaceStatus;
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  bonus_usd?: number;
  note?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mondayOfWeek(offset = 0): Date {
  const today = new Date();
  const dow = today.getDay();
  const diff = today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7;
  const d = new Date(today);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function d(weekOffset: number, dayOffset: number): string {
  const base = mondayOfWeek(weekOffset);
  base.setDate(base.getDate() + dayOffset);
  return base.toISOString().slice(0, 10);
}

// ── Shifts: current week (Mon-Sun) ────────────────────────────────────────────
// dayOffset: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
// week 0 = current, week -1 = last, week 1 = next

export const MOCK_SHIFTS: MockShift[] = [
  // ── Monday ─────────────────────────────────────────────────────────────────
  { id: "shift-001", title: "Morning Housekeeping", role: "housekeeping", date: d(0,0), start_time: "06:00", end_time: "14:00", location_id: "loc-001", assignee_ids: ["user-003","user-004"], capacity: 3, status: "partial", notes: "Focus on checkouts floors 1-2." },
  { id: "shift-002", title: "Evening Housekeeping", role: "housekeeping", date: d(0,0), start_time: "14:00", end_time: "22:00", location_id: "loc-001", assignee_ids: ["user-005"], capacity: 2, status: "partial" },
  { id: "shift-003", title: "AM Front Desk", role: "front_desk", date: d(0,0), start_time: "07:00", end_time: "15:00", location_id: "loc-001", assignee_ids: ["user-002"], capacity: 1, status: "filled" },
  { id: "shift-004", title: "PM Front Desk", role: "front_desk", date: d(0,0), start_time: "15:00", end_time: "23:00", location_id: "loc-001", assignee_ids: [], capacity: 1, status: "open" },
  { id: "shift-005", title: "Maintenance Rounds", role: "maintenance", date: d(0,0), start_time: "08:00", end_time: "16:00", location_id: "loc-001", assignee_ids: ["user-006"], capacity: 1, status: "filled" },

  // ── Tuesday ────────────────────────────────────────────────────────────────
  { id: "shift-006", title: "Morning Housekeeping", role: "housekeeping", date: d(0,1), start_time: "06:00", end_time: "14:00", location_id: "loc-001", assignee_ids: ["user-003","user-004","user-005"], capacity: 3, status: "filled" },
  { id: "shift-007", title: "Evening Housekeeping", role: "housekeeping", date: d(0,1), start_time: "14:00", end_time: "22:00", location_id: "loc-001", assignee_ids: ["user-005"], capacity: 2, status: "partial" },
  { id: "shift-008", title: "AM Front Desk", role: "front_desk", date: d(0,1), start_time: "07:00", end_time: "15:00", location_id: "loc-001", assignee_ids: ["user-002"], capacity: 1, status: "filled" },
  { id: "shift-009", title: "PM Front Desk", role: "front_desk", date: d(0,1), start_time: "15:00", end_time: "23:00", location_id: "loc-001", assignee_ids: ["user-001"], capacity: 1, status: "filled" },

  // ── Wednesday ──────────────────────────────────────────────────────────────
  { id: "shift-010", title: "Morning Housekeeping", role: "housekeeping", date: d(0,2), start_time: "06:00", end_time: "14:00", location_id: "loc-001", assignee_ids: ["user-003"], capacity: 3, status: "partial", notes: "Deep clean suites." },
  { id: "shift-011", title: "Evening Housekeeping", role: "housekeeping", date: d(0,2), start_time: "14:00", end_time: "22:00", location_id: "loc-001", assignee_ids: ["user-004","user-005"], capacity: 2, status: "filled" },
  { id: "shift-012", title: "AM Front Desk", role: "front_desk", date: d(0,2), start_time: "07:00", end_time: "15:00", location_id: "loc-001", assignee_ids: ["user-002"], capacity: 1, status: "filled" },
  { id: "shift-013", title: "Maintenance Rounds", role: "maintenance", date: d(0,2), start_time: "08:00", end_time: "16:00", location_id: "loc-001", assignee_ids: ["user-006"], capacity: 1, status: "filled" },
  { id: "shift-014", title: "Pool Wing Coverage", role: "housekeeping", date: d(0,2), start_time: "09:00", end_time: "17:00", location_id: "loc-002", assignee_ids: ["user-005"], capacity: 1, status: "filled" },

  // ── Thursday (today) ───────────────────────────────────────────────────────
  { id: "shift-015", title: "Morning Housekeeping", role: "housekeeping", date: d(0,3), start_time: "06:00", end_time: "14:00", location_id: "loc-001", assignee_ids: ["user-003","user-004"], capacity: 3, status: "partial", notes: "Priority: checkouts 101, 103, 204." },
  { id: "shift-016", title: "Evening Housekeeping", role: "housekeeping", date: d(0,3), start_time: "14:00", end_time: "22:00", location_id: "loc-001", assignee_ids: [], capacity: 2, status: "open", notes: "Priya posted to marketplace — coverage needed." },
  { id: "shift-017", title: "AM Front Desk", role: "front_desk", date: d(0,3), start_time: "07:00", end_time: "15:00", location_id: "loc-001", assignee_ids: ["user-002"], capacity: 1, status: "filled" },
  { id: "shift-018", title: "PM Front Desk", role: "front_desk", date: d(0,3), start_time: "15:00", end_time: "23:00", location_id: "loc-001", assignee_ids: ["user-001"], capacity: 1, status: "filled" },
  { id: "shift-019", title: "Maintenance Rounds", role: "maintenance", date: d(0,3), start_time: "08:00", end_time: "16:00", location_id: "loc-001", assignee_ids: ["user-006"], capacity: 1, status: "filled" },
  { id: "shift-020", title: "Supervisor On-Duty", role: "supervisor", date: d(0,3), start_time: "08:00", end_time: "20:00", location_id: "loc-001", assignee_ids: ["user-001"], capacity: 1, status: "filled" },

  // ── Friday ─────────────────────────────────────────────────────────────────
  { id: "shift-021", title: "Morning Housekeeping", role: "housekeeping", date: d(0,4), start_time: "06:00", end_time: "14:00", location_id: "loc-001", assignee_ids: ["user-003","user-004","user-005"], capacity: 3, status: "filled" },
  { id: "shift-022", title: "Evening Housekeeping", role: "housekeeping", date: d(0,4), start_time: "14:00", end_time: "22:00", location_id: "loc-001", assignee_ids: ["user-003"], capacity: 2, status: "partial" },
  { id: "shift-023", title: "AM Front Desk", role: "front_desk", date: d(0,4), start_time: "07:00", end_time: "15:00", location_id: "loc-001", assignee_ids: ["user-002"], capacity: 1, status: "filled" },
  { id: "shift-024", title: "PM Front Desk", role: "front_desk", date: d(0,4), start_time: "15:00", end_time: "23:00", location_id: "loc-001", assignee_ids: [], capacity: 1, status: "open" },
  { id: "shift-025", title: "Maintenance Rounds", role: "maintenance", date: d(0,4), start_time: "08:00", end_time: "16:00", location_id: "loc-001", assignee_ids: ["user-006"], capacity: 1, status: "filled" },
  { id: "shift-026", title: "Night Security", role: "supervisor", date: d(0,4), start_time: "23:00", end_time: "07:00", location_id: "loc-001", assignee_ids: [], capacity: 1, status: "open" },

  // ── Saturday ───────────────────────────────────────────────────────────────
  { id: "shift-027", title: "Morning Housekeeping", role: "housekeeping", date: d(0,5), start_time: "07:00", end_time: "15:00", location_id: "loc-001", assignee_ids: ["user-004"], capacity: 3, status: "partial", notes: "Weekend — all checkouts priority." },
  { id: "shift-028", title: "Evening Housekeeping", role: "housekeeping", date: d(0,5), start_time: "15:00", end_time: "23:00", location_id: "loc-001", assignee_ids: [], capacity: 2, status: "open" },
  { id: "shift-029", title: "AM Front Desk", role: "front_desk", date: d(0,5), start_time: "07:00", end_time: "15:00", location_id: "loc-001", assignee_ids: ["user-002"], capacity: 1, status: "filled" },
  { id: "shift-030", title: "PM Front Desk", role: "front_desk", date: d(0,5), start_time: "15:00", end_time: "23:00", location_id: "loc-001", assignee_ids: [], capacity: 1, status: "open" },
  { id: "shift-031", title: "Pool Wing Morning", role: "housekeeping", date: d(0,5), start_time: "08:00", end_time: "16:00", location_id: "loc-002", assignee_ids: ["user-005"], capacity: 1, status: "filled" },

  // ── Sunday ─────────────────────────────────────────────────────────────────
  { id: "shift-032", title: "Morning Housekeeping", role: "housekeeping", date: d(0,6), start_time: "07:00", end_time: "15:00", location_id: "loc-001", assignee_ids: [], capacity: 3, status: "open" },
  { id: "shift-033", title: "AM Front Desk", role: "front_desk", date: d(0,6), start_time: "07:00", end_time: "15:00", location_id: "loc-001", assignee_ids: ["user-002"], capacity: 1, status: "filled" },
  { id: "shift-034", title: "PM Front Desk", role: "front_desk", date: d(0,6), start_time: "15:00", end_time: "23:00", location_id: "loc-001", assignee_ids: [], capacity: 1, status: "open" },
  { id: "shift-035", title: "Pool Wing Coverage", role: "housekeeping", date: d(0,6), start_time: "09:00", end_time: "17:00", location_id: "loc-002", assignee_ids: [], capacity: 1, status: "open" },
];

export const MOCK_SWAP_REQUESTS: MockSwapRequest[] = [
  {
    id: "swap-001",
    shift_id: "shift-015",
    requester_id: "user-004",
    target_user_id: "user-005",
    status: "pending",
    message: "Family appointment Thursday morning — can Priya cover?",
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: "swap-002",
    shift_id: "shift-016",
    requester_id: "user-005",
    target_user_id: null,
    status: "pending",
    message: "Can't make the evening shift Thursday — posted to marketplace too.",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "swap-003",
    shift_id: "shift-007",
    requester_id: "user-005",
    target_user_id: "user-004",
    status: "approved",
    message: "We swapped Tuesday evenings.",
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    resolved_at: new Date(Date.now() - 22 * 3600000).toISOString(),
  },
  {
    id: "swap-004",
    shift_id: "shift-024",
    requester_id: "user-002",
    target_user_id: null,
    status: "pending",
    message: "Open swap — I need Friday PM off. Anyone available?",
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
];

export const MOCK_MARKETPLACE_LISTINGS: MockMarketplaceListing[] = [
  {
    id: "mkt-001",
    shift_id: "shift-016",
    posted_by_user_id: "user-005",
    posted_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: "open",
    claimed_by_user_id: null,
    claimed_at: null,
    bonus_usd: 15,
    note: "Evening housekeeping shift — today. Priya can't make it. Bonus pay included.",
  },
  {
    id: "mkt-002",
    shift_id: "shift-030",
    posted_by_user_id: "user-001",
    posted_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    status: "open",
    claimed_by_user_id: null,
    claimed_at: null,
    note: "Saturday PM Front Desk — no taker yet. Great for weekend earners.",
  },
  {
    id: "mkt-003",
    shift_id: "shift-032",
    posted_by_user_id: "user-001",
    posted_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    status: "open",
    claimed_by_user_id: null,
    claimed_at: null,
    bonus_usd: 25,
    note: "Sunday morning HK — high priority weekend coverage. $25 bonus.",
  },
  {
    id: "mkt-004",
    shift_id: "shift-004",
    posted_by_user_id: "user-001",
    posted_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    status: "claimed",
    claimed_by_user_id: "user-003",
    claimed_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    note: "Monday PM front desk — filled via marketplace.",
  },
];

export const MOCK_ACTIVITY = [
  { id: "act-001", type: "task.completed", description: "Minibar restock completed — Suite 201", actor: "James Boateng", ts: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: "act-002", type: "room.status_changed", description: "Room 103 marked Dirty after checkout", actor: "System", ts: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: "act-003", type: "task.assigned", description: "AC repair (Room 104) assigned to Derek Walsh", actor: "Amara Singh", ts: new Date(Date.now() - 70 * 60000).toISOString() },
  { id: "act-004", type: "task.status_changed", description: "AC repair marked In Progress", actor: "Derek Walsh", ts: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: "act-005", type: "room.status_changed", description: "Room 203 marked Ready for Inspection", actor: "Amara Singh", ts: new Date(Date.now() - 90 * 60000).toISOString() },
  { id: "act-006", type: "task.created", description: "Smoke detector check created for Floor 2", actor: "Sarah Okonkwo", ts: new Date(Date.now() - 120 * 60000).toISOString() },
  { id: "act-007", type: "room.status_changed", description: "Room 104 placed on Maintenance Hold", actor: "Derek Walsh", ts: new Date(Date.now() - 150 * 60000).toISOString() },
];
