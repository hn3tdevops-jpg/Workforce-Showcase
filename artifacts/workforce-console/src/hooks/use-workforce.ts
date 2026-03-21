import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api-client";
import { Room, Task, Assignment, Shift } from "@workspace/api-client-react/src/generated/api.schemas";

export function useRooms(skip = 0, limit = 100) {
  return useQuery({
    queryKey: ["/rooms", skip, limit],
    queryFn: () => fetchApi<Room[]>(`/rooms/?skip=${skip}&limit=${limit}`),
  });
}

export function useTasks(skip = 0, limit = 100) {
  return useQuery({
    queryKey: ["/tasks", skip, limit],
    queryFn: () => fetchApi<Task[]>(`/tasks/?skip=${skip}&limit=${limit}`),
  });
}

export function useAssignments(skip = 0, limit = 100) {
  return useQuery({
    queryKey: ["/assignments", skip, limit],
    queryFn: () => fetchApi<Assignment[]>(`/assignments/?skip=${skip}&limit=${limit}`),
  });
}

export function useShifts(skip = 0, limit = 100) {
  return useQuery({
    queryKey: ["/shifts", skip, limit],
    queryFn: () => fetchApi<Shift[]>(`/shifts/?skip=${skip}&limit=${limit}`),
  });
}
