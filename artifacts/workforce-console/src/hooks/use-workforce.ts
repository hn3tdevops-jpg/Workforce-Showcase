import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api-client";
import { Room, Task, Assignment, Shift } from "@workspace/api-client-react/src/generated/api.schemas";

export interface RelatedEntity {
  entity_id: string;
  entity_type: string;
  role?: string;
}

export interface TimelineEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  actor_id: string;
  payload: Record<string, unknown>;
  related_entities: RelatedEntity[];
}

export interface TimelineResponse {
  total_events: number;
  limit: number;
  offset: number;
  events: TimelineEvent[];
}

export interface TimelineParams {
  entity_id: string;
  entity_type: string;
  start_date?: string;
  end_date?: string;
  event_types?: string;
  limit?: number;
  offset?: number;
}

export function useTimeline(params: TimelineParams, enabled = true) {
  const qs = new URLSearchParams({
    entity_id: params.entity_id,
    entity_type: params.entity_type,
    ...(params.start_date && { start_date: params.start_date }),
    ...(params.end_date && { end_date: params.end_date }),
    ...(params.event_types && { event_types: params.event_types }),
    limit: String(params.limit ?? 50),
    offset: String(params.offset ?? 0),
  });
  return useQuery({
    queryKey: ["/timeline", params],
    queryFn: () => fetchApi<TimelineResponse>(`/timeline?${qs.toString()}`),
    enabled: enabled && !!params.entity_id && !!params.entity_type,
    retry: false,
  });
}

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
