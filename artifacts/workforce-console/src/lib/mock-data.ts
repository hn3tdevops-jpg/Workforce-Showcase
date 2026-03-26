/**
 * Mock data for demo mode.
 * All shapes match the intended live API contract so the adapter swap is transparent.
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
  {
    id: "loc-003",
    name: "Garden Cottages",
    business_id: "biz-001",
    address: "14 Ocean Drive",
    is_active: true,
  },
];

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
      },
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        location_id: "loc-002",
        location_name: "Pool Wing",
        role: "member",
        scope: "location",
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
      },
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        location_id: "loc-002",
        location_name: "Pool Wing",
        role: "member",
        scope: "location",
      },
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        location_id: "loc-003",
        location_name: "Garden Cottages",
        role: "member",
        scope: "location",
      },
    ],
  },
  {
    id: "user-007",
    email: "admin@silversands.com",
    first_name: "Taylor",
    last_name: "Brooks",
    is_active: false,
    job_title: "Administrator",
    memberships: [
      {
        business_id: "biz-001",
        business_name: "Silver Sands Motel",
        role: "admin",
        scope: "business",
      },
    ],
  },
];

export const MOCK_ROOMS = [
  { id: "room-101", name: "Room 101", room_number: "101", room_type: "standard", status: "clean", building: "Main Building", floor: "1", location_id: "loc-001", notes: "Ocean view. Recently deep cleaned." },
  { id: "room-102", name: "Room 102", room_number: "102", room_type: "standard", status: "occupied", building: "Main Building", floor: "1", location_id: "loc-001", notes: "Guest checked in yesterday." },
  { id: "room-103", name: "Room 103", room_number: "103", room_type: "standard", status: "dirty", building: "Main Building", floor: "1", location_id: "loc-001", notes: "Checkout today. Awaiting cleaning." },
  { id: "room-104", name: "Room 104", room_number: "104", room_type: "deluxe", status: "maintenance", building: "Main Building", floor: "1", location_id: "loc-001", notes: "AC unit requires repair." },
  { id: "room-201", name: "Room 201", room_number: "201", room_type: "suite", status: "clean", building: "Main Building", floor: "2", location_id: "loc-001", notes: "Premium suite. Minibar restocked." },
  { id: "room-202", name: "Room 202", room_number: "202", room_type: "standard", status: "occupied", building: "Main Building", floor: "2", location_id: "loc-001", notes: "" },
  { id: "room-203", name: "Room 203", room_number: "203", room_type: "standard", status: "inspecting", building: "Main Building", floor: "2", location_id: "loc-001", notes: "Inspection in progress." },
  { id: "room-p01", name: "Pool 01", room_number: "P01", room_type: "poolside", status: "clean", building: "Pool Wing", floor: "G", location_id: "loc-002", notes: "Poolside cabana." },
  { id: "room-p02", name: "Pool 02", room_number: "P02", room_type: "poolside", status: "dirty", building: "Pool Wing", floor: "G", location_id: "loc-002", notes: "" },
  { id: "room-p03", name: "Pool 03", room_number: "P03", room_type: "poolside", status: "occupied", building: "Pool Wing", floor: "G", location_id: "loc-002", notes: "" },
  { id: "room-c01", name: "Cottage 1", room_number: "C01", room_type: "cottage", status: "clean", building: "Garden Cottages", floor: "G", location_id: "loc-003", notes: "Garden view cottage. Pet friendly." },
  { id: "room-c02", name: "Cottage 2", room_number: "C02", room_type: "cottage", status: "maintenance", building: "Garden Cottages", floor: "G", location_id: "loc-003", notes: "Roof gutter needs attention." },
];

export const MOCK_TASKS = [
  { id: "task-001", title: "Clean Room 103", description: "Standard checkout clean. Change all linens.", task_type: "housekeeping", priority: "high", status: "pending", due_date: new Date(Date.now() + 1 * 3600000).toISOString(), assigned_to: null, location_id: "loc-001", room_id: "room-103" },
  { id: "task-002", title: "Repair AC Unit — Room 104", description: "Guest reported AC not cooling properly. Technician required.", task_type: "maintenance", priority: "critical", status: "in_progress", due_date: new Date(Date.now() + 2 * 3600000).toISOString(), assigned_to: "user-006", location_id: "loc-001", room_id: "room-104" },
  { id: "task-003", title: "Inspect Room 203", description: "Post-checkout inspection before marking ready.", task_type: "inspection", priority: "medium", status: "in_progress", due_date: new Date(Date.now() + 0.5 * 3600000).toISOString(), assigned_to: "user-003", location_id: "loc-001", room_id: "room-203" },
  { id: "task-004", title: "Restock minibar — Suite 201", description: "Minibar consumption from previous guest. Restock per par list.", task_type: "housekeeping", priority: "low", status: "completed", due_date: new Date(Date.now() - 1 * 3600000).toISOString(), assigned_to: "user-004", location_id: "loc-001", room_id: "room-201" },
  { id: "task-005", title: "Clean Pool 02", description: "Pool cabana checkout clean.", task_type: "housekeeping", priority: "medium", status: "pending", due_date: new Date(Date.now() + 3 * 3600000).toISOString(), assigned_to: null, location_id: "loc-002", room_id: "room-p02" },
  { id: "task-006", title: "Roof gutter — Cottage 2", description: "Leaf buildup reported. Clear and inspect.", task_type: "maintenance", priority: "medium", status: "pending", due_date: new Date(Date.now() + 24 * 3600000).toISOString(), assigned_to: null, location_id: "loc-003", room_id: "room-c02" },
  { id: "task-007", title: "Linen delivery — Main Building", description: "Collect and deliver clean linen from laundry.", task_type: "logistics", priority: "medium", status: "completed", due_date: new Date(Date.now() - 2 * 3600000).toISOString(), assigned_to: "user-004", location_id: "loc-001", room_id: null },
  { id: "task-008", title: "Check smoke detectors — Floor 2", description: "Quarterly smoke detector test for Floor 2 rooms.", task_type: "safety", priority: "high", status: "pending", due_date: new Date(Date.now() + 6 * 3600000).toISOString(), assigned_to: null, location_id: "loc-001", room_id: null },
  { id: "task-009", title: "Welcome pack — Room 201", description: "VIP arrival. Place welcome pack, flowers, and champagne.", task_type: "concierge", priority: "high", status: "cancelled", due_date: new Date(Date.now() - 5 * 3600000).toISOString(), assigned_to: "user-002", location_id: "loc-001", room_id: "room-201" },
];

export const MOCK_ACTIVITY = [
  { id: "act-001", type: "task.completed", description: "Minibar restock completed — Suite 201", actor: "James Boateng", ts: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: "act-002", type: "room.status_changed", description: "Room 103 marked Dirty after checkout", actor: "System", ts: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: "act-003", type: "task.assigned", description: "AC repair (Room 104) assigned to Derek Walsh", actor: "Amara Singh", ts: new Date(Date.now() - 70 * 60000).toISOString() },
  { id: "act-004", type: "task.status_changed", description: "AC repair marked In Progress", actor: "Derek Walsh", ts: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: "act-005", type: "room.status_changed", description: "Room 203 set to Inspecting", actor: "Amara Singh", ts: new Date(Date.now() - 90 * 60000).toISOString() },
  { id: "act-006", type: "task.created", description: "Smoke detector check created for Floor 2", actor: "Sarah Okonkwo", ts: new Date(Date.now() - 120 * 60000).toISOString() },
  { id: "act-007", type: "task.completed", description: "Linen delivery to Main Building completed", actor: "James Boateng", ts: new Date(Date.now() - 150 * 60000).toISOString() },
];
