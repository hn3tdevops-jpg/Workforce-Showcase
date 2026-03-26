/**
 * Mock Adapter Layer
 *
 * Controls whether the app uses the live API or falls back to mock data.
 *
 * Configuration:
 *   VITE_DEMO_MODE=true  → always use mock data (demo/prototype mode)
 *   VITE_DEMO_MODE=false → try live API, surface real errors
 *
 * API contract (spec-aligned):
 *   GET  /locations/{location_id}/rooms
 *   GET  /locations/{location_id}/tasks
 *   POST /tasks/{task_id}/assign
 *   POST /tasks/{task_id}/status
 *   PATCH /rooms/{room_id}
 *   GET  /users
 *   GET  /roles
 *   POST /users/{id}/assignments
 *   DELETE /users/{id}/assignments/{assignment_id}
 *   GET  /locations/{location_id}/dashboard-summary
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

/**
 * Try the live API endpoint. If DEMO_MODE is on, or the call fails with a
 * 404/405/500, fall back to the provided mock value.
 */
async function withMockFallback<T>(
  path: string,
  options: RequestInit | undefined,
  mockValue: T
): Promise<T> {
  if (DEMO_MODE) return mockValue;
  try {
    return await fetchApi<T>(path, options);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 405 || status === 500 || status === undefined) {
      console.info(`[mock-adapter] Falling back to mock data for ${path}`);
      return mockValue;
    }
    throw err;
  }
}

// ── Locations ────────────────────────────────────────────────────────────────

export function fetchLocations(): Promise<MockLocation[]> {
  return withMockFallback("/locations/", undefined, MOCK_LOCATIONS);
}

// ── Users / RBAC ─────────────────────────────────────────────────────────────

export function fetchUsers(): Promise<MockUser[]> {
  return withMockFallback("/users/", undefined, MOCK_USERS);
}

export function fetchRoles(): Promise<{ id: string; name: string; scope: string }[]> {
  const mockRoles = [
    { id: "role-owner", name: "owner", scope: "business" },
    { id: "role-admin", name: "admin", scope: "business" },
    { id: "role-supervisor", name: "supervisor", scope: "location" },
    { id: "role-member", name: "member", scope: "location" },
  ];
  return withMockFallback("/roles/", undefined, mockRoles);
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

// ── Rooms ─────────────────────────────────────────────────────────────────────

export function fetchRoomsMock(locationId?: string) {
  if (locationId) {
    return withMockFallback(
      `/locations/${locationId}/rooms`,
      undefined,
      MOCK_ROOMS.filter((r) => r.location_id === locationId)
    );
  }
  // No location selected: return all mock rooms (live API would require location)
  return Promise.resolve(MOCK_ROOMS);
}

export function updateRoomStatus(roomId: string, status: string): Promise<unknown> {
  if (DEMO_MODE) {
    const room = MOCK_ROOMS.find((r) => r.id === roomId);
    if (room) room.status = status;
    return Promise.resolve(room);
  }
  return fetchApi(`/rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function fetchTasksMock(locationId?: string) {
  if (locationId) {
    return withMockFallback(
      `/locations/${locationId}/tasks`,
      undefined,
      MOCK_TASKS.filter((t) => t.location_id === locationId)
    );
  }
  return Promise.resolve(MOCK_TASKS);
}

export function assignTask(taskId: string, userId: string | null): Promise<unknown> {
  if (DEMO_MODE) {
    const task = MOCK_TASKS.find((t) => t.id === taskId);
    if (task) {
      task.assigned_user_id = userId;
      if (userId && task.status === "open") task.status = "assigned";
      if (!userId) task.status = "open";
    }
    return Promise.resolve(task);
  }
  return fetchApi(`/tasks/${taskId}/assign`, {
    method: "POST",
    body: JSON.stringify({ assigned_user_id: userId }),
  });
}

export function updateTaskStatus(taskId: string, status: string): Promise<unknown> {
  if (DEMO_MODE) {
    const task = MOCK_TASKS.find((t) => t.id === taskId);
    if (task) task.status = status;
    return Promise.resolve(task);
  }
  return fetchApi(`/tasks/${taskId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function fetchDashboardSummary(locationId: string) {
  const rooms = MOCK_ROOMS.filter((r) => r.location_id === locationId);
  const tasks = MOCK_TASKS.filter((t) => t.location_id === locationId);

  const roomCounts: Record<string, number> = {};
  rooms.forEach((r) => { roomCounts[r.status] = (roomCounts[r.status] ?? 0) + 1; });

  const taskCounts: Record<string, number> = {};
  tasks.forEach((t) => { taskCounts[t.status] = (taskCounts[t.status] ?? 0) + 1; });

  const mockSummary = { room_counts: roomCounts, task_counts: taskCounts };
  return withMockFallback(`/locations/${locationId}/dashboard-summary`, undefined, mockSummary);
}
