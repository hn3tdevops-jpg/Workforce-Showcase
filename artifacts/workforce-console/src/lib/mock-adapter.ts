/**
 * Mock Adapter Layer
 *
 * Controls whether the app uses the live hospitable API or falls back to mock data.
 *
 * Configuration:
 *   VITE_DEMO_MODE=true  → always use mock data (demo/prototype mode)
 *   VITE_DEMO_MODE=false → use live hospitable API for rooms/tasks/dashboard
 *
 * Hospitable API base: /api/v1/hospitable  (proxied → localhost:8080)
 * Auth / users / roles:  /api/v1           (proxied → PythonAnywhere)
 */

import { fetchApi } from "./api-client";
import {
  MOCK_USERS,
  MOCK_LOCATIONS,
  MOCK_ROOMS,
  MOCK_TASKS,
  MOCK_SHIFTS,
  MOCK_SWAP_REQUESTS,
  MOCK_MARKETPLACE_LISTINGS,
  type MockUser,
  type MockLocation,
  type MockShift,
  type MockSwapRequest,
  type MockMarketplaceListing,
  type ShiftRole,
  type ShiftStatus,
  type SwapStatus,
  type MarketplaceStatus,
  type ShiftAssignee,
} from "./mock-data";

export type {
  MockShift, MockSwapRequest, MockMarketplaceListing,
  ShiftRole, ShiftStatus, SwapStatus, MarketplaceStatus,
  ShiftAssignee,
};

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

// ── Raw types returned by the hospitable API ──────────────────────────────────

export interface HospitableRoom {
  id: number;
  location_id: string;
  building_id: number | null;
  floor_id: number | null;
  sector_id: number | null;
  room_number: string;
  room_label: string | null;
  room_type: string | null;
  bed_count: number | null;
  bed_type_summary: string | null;
  housekeeping_status: string;
  occupancy_status: string;
  inspection_status: string;
  maintenance_status: string;
  pet_policy: string | null;
  smoking_status: string | null;
  notes: string | null;
  last_cleaned_at: string | null;
  last_inspected_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields from property_buildings / property_floors
  building_name: string | null;
  building_code: string | null;
  floor_label: string | null;
  floor_number: number | null;
}

export interface HospitableTask {
  id: number;
  location_id: string;
  room_id: number | null;
  room_number: string | null;
  task_type: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_user_id: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HospitableDashboardSummary {
  total_rooms: number;
  dirty: number;
  assigned: number;
  cleaning: number;
  clean: number;
  inspect: number;
  inspected: number;
  blocked: number;
  open_tasks: number;
  blocked_tasks: number;
  completed_tasks_today: number;
  unresolved_issues: number;
}

// ── Shape expected by the Rooms page and RoomDrawer ───────────────────────────

export interface NormalizedRoom {
  id: string;
  name: string;
  room_number: string;
  room_type: string | null;
  room_label: string | null;
  /** Uses hospitable status names: dirty|assigned|cleaning|clean|inspect|inspected|blocked */
  status: string;
  building: string | null;
  building_code: string | null;
  floor: string | null;
  floor_number: number | null;
  notes: string | null;
  location_id: string;
  /** Retained for API mutations */
  _hospitable_id: number;
  occupancy_status?: string;
  inspection_status?: string;
  maintenance_status?: string;
  bed_type_summary?: string | null;
  bed_count?: number | null;
  pet_policy?: string | null;
  smoking_status?: string | null;
  last_cleaned_at?: string | null;
  last_inspected_at?: string | null;
}

// ── Shape expected by the Tasks page ─────────────────────────────────────────

export interface NormalizedTask {
  id: string;
  title: string;
  description: string | null;
  task_type: string | null;
  priority: string | null;
  /** API "done" is mapped → "completed" */
  status: string | null;
  due_at: string | null;
  assigned_user_id: string | null;
  location_id: string;
  room_id: string | null;
  room_number: string | null;
  _hospitable_id: number;
}

// ── Normalisers ───────────────────────────────────────────────────────────────

function normalizeRoom(r: HospitableRoom): NormalizedRoom {
  return {
    id: String(r.id),
    name: `Room ${r.room_number}`,
    room_number: r.room_number,
    room_label: r.room_label ?? null,
    room_type: r.room_type ?? null,
    status: r.housekeeping_status,
    building: r.building_name ?? null,
    building_code: r.building_code ?? null,
    floor: r.floor_label ?? null,
    floor_number: r.floor_number ?? null,
    notes: r.notes ?? null,
    location_id: r.location_id,
    _hospitable_id: r.id,
    occupancy_status: r.occupancy_status,
    inspection_status: r.inspection_status,
    maintenance_status: r.maintenance_status,
    bed_type_summary: r.bed_type_summary ?? null,
    bed_count: r.bed_count ?? null,
    pet_policy: r.pet_policy ?? null,
    smoking_status: r.smoking_status ?? null,
    last_cleaned_at: r.last_cleaned_at ?? null,
    last_inspected_at: r.last_inspected_at ?? null,
  };
}

function normalizeTask(t: HospitableTask): NormalizedTask {
  return {
    id: String(t.id),
    title: t.title,
    description: t.description ?? null,
    task_type: t.task_type ?? null,
    priority: t.priority ?? null,
    status: t.status === "done" ? "completed" : (t.status ?? null),
    due_at: t.due_at ?? null,
    assigned_user_id: t.assigned_user_id ?? null,
    location_id: t.location_id,
    room_id: t.room_id ? String(t.room_id) : null,
    room_number: t.room_number ?? null,
    _hospitable_id: t.id,
  };
}

// ── Locations ─────────────────────────────────────────────────────────────────

export function fetchLocations(): Promise<MockLocation[]> {
  if (DEMO_MODE) return Promise.resolve(MOCK_LOCATIONS);
  return fetchApi<MockLocation[]>("/locations/").catch(() => MOCK_LOCATIONS);
}

// ── Users / RBAC ─────────────────────────────────────────────────────────────

export function fetchUsers(): Promise<MockUser[]> {
  if (DEMO_MODE) return Promise.resolve(MOCK_USERS);
  return fetchApi<MockUser[]>("/users/").catch(() => MOCK_USERS);
}

export function fetchRoles(): Promise<{ id: string; name: string; scope: string }[]> {
  const mockRoles = [
    { id: "role-owner", name: "owner", scope: "business" },
    { id: "role-admin", name: "admin", scope: "business" },
    { id: "role-supervisor", name: "supervisor", scope: "location" },
    { id: "role-member", name: "member", scope: "location" },
  ];
  if (DEMO_MODE) return Promise.resolve(mockRoles);
  return fetchApi<typeof mockRoles>("/roles/").catch(() => mockRoles);
}

export function assignUserRole(
  userId: string,
  payload: {
    role_id: string;
    business_id: string;
    scope_type: "BUSINESS" | "LOCATION";
    location_id?: string;
    job_title_label?: string;
  }
): Promise<MockUser> {
  if (DEMO_MODE) {
    const user = MOCK_USERS.find((u) => u.id === userId)!;
    return Promise.resolve({ ...user });
  }
  return fetchApi(`/users/${userId}/assignments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function removeUserRole(userId: string, assignmentId: string): Promise<void> {
  if (DEMO_MODE) return Promise.resolve();
  return fetchApi(`/users/${userId}/assignments/${assignmentId}`, { method: "DELETE" });
}

// ── Rooms — hospitable API ────────────────────────────────────────────────────

export async function fetchRoomsMock(locationId?: string): Promise<NormalizedRoom[]> {
  if (DEMO_MODE) {
    const mockList = locationId
      ? MOCK_ROOMS.filter((r) => r.location_id === locationId)
      : MOCK_ROOMS;
    return mockList as unknown as NormalizedRoom[];
  }
  if (!locationId) return [];
  const raw = await fetchApi<HospitableRoom[]>(
    `/hospitable/rooms?location_id=${encodeURIComponent(locationId)}`
  );
  return raw.map(normalizeRoom);
}

export async function updateRoom(
  roomId: string,
  patch: {
    room_number?: string;
    room_label?: string;
    room_type?: string;
    bed_count?: number | null;
    bed_type_summary?: string;
    pet_policy?: string;
    smoking_status?: string;
    notes?: string;
  }
): Promise<unknown> {
  if (DEMO_MODE) {
    const room = MOCK_ROOMS.find((r) => String(r.id) === roomId);
    if (room) Object.assign(room, patch);
    return Promise.resolve(room);
  }
  return fetchApi(`/hospitable/rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function updateRoomStatus(roomId: string, status: string): Promise<unknown> {
  if (DEMO_MODE) {
    const room = MOCK_ROOMS.find((r) => r.id === roomId);
    if (room) room.status = status;
    return Promise.resolve(room);
  }
  return fetchApi(`/hospitable/rooms/${roomId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ housekeeping_status: status }),
  });
}

// ── Tasks — hospitable API ────────────────────────────────────────────────────

export async function fetchTasksMock(locationId?: string): Promise<NormalizedTask[]> {
  if (DEMO_MODE) {
    const mockList = locationId
      ? MOCK_TASKS.filter((t) => t.location_id === locationId)
      : MOCK_TASKS;
    return mockList as unknown as NormalizedTask[];
  }
  if (!locationId) return [];
  const raw = await fetchApi<HospitableTask[]>(
    `/hospitable/tasks?location_id=${encodeURIComponent(locationId)}`
  );
  return raw.map(normalizeTask);
}

export async function assignTask(taskId: string, userId: string | null): Promise<unknown> {
  if (DEMO_MODE) {
    const task = MOCK_TASKS.find((t) => t.id === taskId);
    if (task) {
      task.assigned_user_id = userId;
      if (userId && task.status === "open") task.status = "assigned";
      if (!userId) task.status = "open";
    }
    return Promise.resolve(task);
  }
  return fetchApi(`/hospitable/tasks/${taskId}/assign`, {
    method: "POST",
    body: JSON.stringify({ assigned_user_id: userId }),
  });
}

export async function updateTaskStatus(taskId: string, status: string): Promise<unknown> {
  if (DEMO_MODE) {
    const task = MOCK_TASKS.find((t) => t.id === taskId);
    if (task) task.status = status;
    return Promise.resolve(task);
  }
  const apiStatus = status === "completed" ? "done" : status;
  return fetchApi(`/hospitable/tasks/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: apiStatus }),
  });
}

export async function createTask(data: {
  location_id: string;
  room_id?: number | null;
  task_type?: string;
  title: string;
  description?: string | null;
  priority?: string;
  assigned_user_id?: string | null;
  due_at?: string | null;
  created_by_user_id?: string | null;
}): Promise<NormalizedTask> {
  if (DEMO_MODE) {
    const task: NormalizedTask = {
      id: `task-${Date.now()}`,
      title: data.title,
      description: data.description ?? null,
      task_type: data.task_type ?? "general",
      priority: data.priority ?? "normal",
      status: "open",
      due_at: data.due_at ?? null,
      assigned_user_id: data.assigned_user_id ?? null,
      location_id: data.location_id,
      room_id: data.room_id ? String(data.room_id) : null,
      room_number: null,
      _hospitable_id: Date.now(),
    };
    (MOCK_TASKS as unknown as NormalizedTask[]).push(task);
    return task;
  }
  const raw = await fetchApi<HospitableTask>("/hospitable/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return normalizeTask(raw);
}

// ── Dashboard — hospitable API ────────────────────────────────────────────────

export async function fetchDashboardSummary(locationId: string): Promise<HospitableDashboardSummary> {
  if (DEMO_MODE) {
    const rooms = MOCK_ROOMS.filter((r) => r.location_id === locationId);
    const tasks = MOCK_TASKS.filter((t) => t.location_id === locationId);
    const roomCounts: Record<string, number> = {};
    rooms.forEach((r) => { const s = r.status ?? "unknown"; roomCounts[s] = (roomCounts[s] ?? 0) + 1; });
    const openTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length;
    return {
      total_rooms: rooms.length,
      dirty: roomCounts["dirty"] ?? 0,
      assigned: roomCounts["assigned"] ?? 0,
      cleaning: roomCounts["cleaning"] ?? 0,
      clean: roomCounts["clean"] ?? 0,
      inspect: roomCounts["ready_for_inspection"] ?? 0,
      inspected: roomCounts["inspected"] ?? 0,
      blocked: roomCounts["maintenance_hold"] ?? 0,
      open_tasks: openTasks,
      blocked_tasks: 0,
      completed_tasks_today: 0,
      unresolved_issues: 0,
    };
  }
  return fetchApi<HospitableDashboardSummary>(
    `/hospitable/dashboard/room-board-summary?location_id=${encodeURIComponent(locationId)}`
  );
}

export async function fetchMaintenanceBoard(locationId: string): Promise<unknown[]> {
  if (DEMO_MODE) return [];
  return fetchApi<unknown[]>(
    `/hospitable/dashboard/maintenance-board?location_id=${encodeURIComponent(locationId)}`
  );
}

// ── Scheduling API ────────────────────────────────────────────────────────────

export async function fetchShifts(
  locationId?: string,
  weekStart?: string,
): Promise<MockShift[]> {
  if (DEMO_MODE) {
    let shifts = [...MOCK_SHIFTS];
    if (locationId) shifts = shifts.filter(s => s.location_id === locationId);
    if (weekStart) {
      const start = new Date(weekStart);
      const end   = new Date(weekStart);
      end.setDate(start.getDate() + 7);
      shifts = shifts.filter(s => {
        const d = new Date(s.date);
        return d >= start && d < end;
      });
    }
    return Promise.resolve(shifts);
  }
  const params = new URLSearchParams();
  if (locationId) params.set("location_id", locationId);
  if (weekStart)  params.set("week_start", weekStart);
  return fetchApi<MockShift[]>(`/shifts/?${params}`);
}

export async function createShift(data: Omit<MockShift, "id">): Promise<MockShift> {
  if (DEMO_MODE) {
    const shift: MockShift = { ...data, id: `shift-${Date.now()}` };
    MOCK_SHIFTS.push(shift);
    return Promise.resolve(shift);
  }
  return fetchApi<MockShift>("/shifts/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateShift(
  shiftId: string,
  patch: Partial<Omit<MockShift, "id">>,
): Promise<MockShift> {
  if (DEMO_MODE) {
    const idx = MOCK_SHIFTS.findIndex(s => s.id === shiftId);
    if (idx !== -1) Object.assign(MOCK_SHIFTS[idx], patch);
    return Promise.resolve(MOCK_SHIFTS[idx]);
  }
  return fetchApi<MockShift>(`/shifts/${shiftId}`, {
    method: "PATCH", body: JSON.stringify(patch),
  });
}

export async function deleteShift(shiftId: string): Promise<void> {
  if (DEMO_MODE) {
    const idx = MOCK_SHIFTS.findIndex(s => s.id === shiftId);
    if (idx !== -1) MOCK_SHIFTS.splice(idx, 1);
    return Promise.resolve();
  }
  return fetchApi<void>(`/shifts/${shiftId}`, { method: "DELETE" });
}

export async function addAssigneeToShift(shiftId: string, userId: string): Promise<MockShift> {
  if (DEMO_MODE) {
    const shift = MOCK_SHIFTS.find(s => s.id === shiftId);
    if (shift && !shift.assignee_ids.includes(userId)) {
      shift.assignee_ids.push(userId);
      if (shift.assignee_ids.length >= shift.capacity) shift.status = "filled";
      else shift.status = "partial";
    }
    return Promise.resolve(shift!);
  }
  return fetchApi<MockShift>(`/shifts/${shiftId}/assignees`, {
    method: "POST", body: JSON.stringify({ user_id: userId }),
  });
}

export async function removeAssigneeFromShift(shiftId: string, userId: string): Promise<MockShift> {
  if (DEMO_MODE) {
    const shift = MOCK_SHIFTS.find(s => s.id === shiftId);
    if (shift) {
      shift.assignee_ids = shift.assignee_ids.filter(id => id !== userId);
      shift.status = shift.assignee_ids.length === 0 ? "open" : "partial";
    }
    return Promise.resolve(shift!);
  }
  return fetchApi<MockShift>(`/shifts/${shiftId}/assignees/${userId}`, { method: "DELETE" });
}

// ── Swap Requests ─────────────────────────────────────────────────────────────

export async function fetchSwapRequests(): Promise<MockSwapRequest[]> {
  if (DEMO_MODE) return Promise.resolve([...MOCK_SWAP_REQUESTS]);
  return fetchApi<MockSwapRequest[]>("/shifts/swaps/");
}

export async function createSwapRequest(
  data: Omit<MockSwapRequest, "id" | "created_at">,
): Promise<MockSwapRequest> {
  if (DEMO_MODE) {
    const req: MockSwapRequest = {
      ...data,
      id: `swap-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    MOCK_SWAP_REQUESTS.push(req);
    return Promise.resolve(req);
  }
  return fetchApi<MockSwapRequest>("/shifts/swaps/", {
    method: "POST", body: JSON.stringify(data),
  });
}

export async function resolveSwapRequest(
  swapId: string,
  action: "approved" | "denied" | "accepted" | "withdrawn",
): Promise<MockSwapRequest> {
  if (DEMO_MODE) {
    const req = MOCK_SWAP_REQUESTS.find(s => s.id === swapId);
    if (req) {
      req.status = action;
      req.resolved_at = new Date().toISOString();
      if (action === "approved" && req.target_user_id) {
        const shift = MOCK_SHIFTS.find(s => s.id === req.shift_id);
        if (shift) {
          shift.assignee_ids = shift.assignee_ids.filter(id => id !== req.requester_id);
          if (!shift.assignee_ids.includes(req.target_user_id)) {
            shift.assignee_ids.push(req.target_user_id);
          }
        }
      }
    }
    return Promise.resolve(req!);
  }
  return fetchApi<MockSwapRequest>(`/shifts/swaps/${swapId}/${action}`, { method: "POST" });
}

// ── Shift Marketplace ─────────────────────────────────────────────────────────

export async function fetchMarketplaceListings(): Promise<MockMarketplaceListing[]> {
  if (DEMO_MODE) return Promise.resolve([...MOCK_MARKETPLACE_LISTINGS]);
  return fetchApi<MockMarketplaceListing[]>("/shifts/marketplace/");
}

export async function postToMarketplace(
  data: Omit<MockMarketplaceListing, "id" | "posted_at" | "claimed_by_user_id" | "claimed_at">,
): Promise<MockMarketplaceListing> {
  if (DEMO_MODE) {
    const listing: MockMarketplaceListing = {
      ...data,
      id: `mkt-${Date.now()}`,
      posted_at: new Date().toISOString(),
      claimed_by_user_id: null,
      claimed_at: null,
    };
    MOCK_MARKETPLACE_LISTINGS.push(listing);
    return Promise.resolve(listing);
  }
  return fetchApi<MockMarketplaceListing>("/shifts/marketplace/", {
    method: "POST", body: JSON.stringify(data),
  });
}

export async function claimMarketplaceListing(
  listingId: string,
  userId: string,
): Promise<MockMarketplaceListing> {
  if (DEMO_MODE) {
    const listing = MOCK_MARKETPLACE_LISTINGS.find(l => l.id === listingId);
    if (listing && listing.status === "open") {
      listing.status = "claimed";
      listing.claimed_by_user_id = userId;
      listing.claimed_at = new Date().toISOString();
      const shift = MOCK_SHIFTS.find(s => s.id === listing.shift_id);
      if (shift && !shift.assignee_ids.includes(userId)) {
        shift.assignee_ids.push(userId);
        shift.status = shift.assignee_ids.length >= shift.capacity ? "filled" : "partial";
      }
    }
    return Promise.resolve(listing!);
  }
  return fetchApi<MockMarketplaceListing>(`/shifts/marketplace/${listingId}/claim`, {
    method: "POST", body: JSON.stringify({ user_id: userId }),
  });
}

export async function cancelMarketplaceListing(listingId: string): Promise<MockMarketplaceListing> {
  if (DEMO_MODE) {
    const listing = MOCK_MARKETPLACE_LISTINGS.find(l => l.id === listingId);
    if (listing) listing.status = "cancelled";
    return Promise.resolve(listing!);
  }
  return fetchApi<MockMarketplaceListing>(`/shifts/marketplace/${listingId}/cancel`, {
    method: "POST",
  });
}
