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
  type MockUser,
  type MockLocation,
} from "./mock-data";

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
  notes: string | null;
  last_cleaned_at: string | null;
  last_inspected_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  /** Uses hospitable status names: dirty|assigned|cleaning|clean|inspect|inspected|blocked */
  status: string;
  building: string | null;
  floor: string | null;
  notes: string | null;
  location_id: string;
  /** Retained for API mutations */
  _hospitable_id: number;
  occupancy_status?: string;
  inspection_status?: string;
  maintenance_status?: string;
  bed_type_summary?: string | null;
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
    room_type: r.room_type ?? null,
    status: r.housekeeping_status,
    building: null,
    floor: null,
    notes: r.notes ?? null,
    location_id: r.location_id,
    _hospitable_id: r.id,
    occupancy_status: r.occupancy_status,
    inspection_status: r.inspection_status,
    maintenance_status: r.maintenance_status,
    bed_type_summary: r.bed_type_summary ?? null,
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
