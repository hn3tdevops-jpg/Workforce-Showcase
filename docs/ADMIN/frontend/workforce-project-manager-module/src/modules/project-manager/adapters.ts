import type { ProgressEntry, ProjectDoc, ProjectSource, ProjectTask } from "./types";

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchDocs(url: string): Promise<ProjectDoc[]> {
  return readJson<ProjectDoc[]>(url);
}

export async function fetchTasks(url: string): Promise<ProjectTask[]> {
  return readJson<ProjectTask[]>(url);
}

export async function fetchSources(url: string): Promise<ProjectSource[]> {
  return readJson<ProjectSource[]>(url);
}

export async function fetchProgress(url: string): Promise<ProgressEntry[]> {
  return readJson<ProgressEntry[]>(url);
}

export async function fetchAiBrief<TResponse = unknown>(url: string, payload: unknown): Promise<TResponse> {
  return readJson<TResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
