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

export const MOCK_ACTIVITY = [
  { id: "act-001", type: "task.completed", description: "Minibar restock completed — Suite 201", actor: "James Boateng", ts: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: "act-002", type: "room.status_changed", description: "Room 103 marked Dirty after checkout", actor: "System", ts: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: "act-003", type: "task.assigned", description: "AC repair (Room 104) assigned to Derek Walsh", actor: "Amara Singh", ts: new Date(Date.now() - 70 * 60000).toISOString() },
  { id: "act-004", type: "task.status_changed", description: "AC repair marked In Progress", actor: "Derek Walsh", ts: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: "act-005", type: "room.status_changed", description: "Room 203 marked Ready for Inspection", actor: "Amara Singh", ts: new Date(Date.now() - 90 * 60000).toISOString() },
  { id: "act-006", type: "task.created", description: "Smoke detector check created for Floor 2", actor: "Sarah Okonkwo", ts: new Date(Date.now() - 120 * 60000).toISOString() },
  { id: "act-007", type: "room.status_changed", description: "Room 104 placed on Maintenance Hold", actor: "Derek Walsh", ts: new Date(Date.now() - 150 * 60000).toISOString() },
];
