import type { LoginRequest, SwitchBusinessRequest } from "@workspace/api-client-react/src/generated/api.schemas";

const envBase = import.meta.env.VITE_API_BASE_URL;
// When VITE_API_BASE_URL is set, use it directly (requires CORS on the server).
// When not set, use the relative path /api/v1 which is proxied by the Vite dev
// server to https://hn3t.pythonanywhere.com — no CORS issues in development.
export const API_BASE = envBase
  ? `${envBase.replace(/\/$/, "")}/api/v1`
  : "/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("workforce_token");
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = "An error occurred";
    try {
      const errorData = await response.json();
      message = errorData.detail || errorData.message || message;
    } catch {
      message = response.statusText;
    }
    
    if (response.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    
    throw new ApiError(response.status, message);
  }

  return response.json();
}
