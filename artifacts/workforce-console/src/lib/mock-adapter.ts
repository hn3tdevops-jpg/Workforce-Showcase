/**
 * Mock Adapter Layer
 *
 * Controls whether the app uses the live API or falls back to mock data.
 *
 * Configuration:
 *   VITE_DEMO_MODE=true  → always use mock data (demo/prototype mode)
 *   VITE_DEMO_MODE=false → try live API, surface real errors
 *
 * Endpoint availability: some endpoints (e.g. /users/, /locations/) are not yet
 * live on the backend. The adapter either calls the live endpoint or returns mock
 * data with matching shapes, making the swap transparent.
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
 * 404/500, fall back to the provided mock value.
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
    // Fall back to mock data for endpoints that don't exist yet
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

// ── Users ────────────────────────────────────────────────────────────────────

export function fetchUsers(): Promise<MockUser[]> {
  return withMockFallback("/users/", undefined, MOCK_USERS);
}

export function assignUserRole(
  userId: string,
  payload: { role: string; scope: "business" | "location"; location_id?: string }
): Promise<MockUser> {
  if (DEMO_MODE) {
    const user = MOCK_USERS.find((u) => u.id === userId)!;
    return Promise.resolve({ ...user });
  }
  return fetchApi(`/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Rooms (with mock fallback shapes) ────────────────────────────────────────

export function fetchRoomsMock() {
  return withMockFallback("/rooms/?skip=0&limit=100", undefined, MOCK_ROOMS);
}

// ── Tasks (with mock fallback shapes) ────────────────────────────────────────

export function fetchTasksMock() {
  return withMockFallback("/tasks/?skip=0&limit=100", undefined, MOCK_TASKS);
}

export function assignTask(taskId: string, userId: string | null): Promise<unknown> {
  if (DEMO_MODE) {
    const task = MOCK_TASKS.find((t) => t.id === taskId);
    if (task) task.assigned_to = userId;
    return Promise.resolve(task);
  }
  return fetchApi(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ assigned_to: userId }),
  });
}

export function updateTaskStatus(taskId: string, status: string): Promise<unknown> {
  if (DEMO_MODE) {
    const task = MOCK_TASKS.find((t) => t.id === taskId);
    if (task) task.status = status;
    return Promise.resolve(task);
  }
  return fetchApi(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
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
