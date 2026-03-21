import type { LoginRequest, SwitchBusinessRequest } from "@workspace/api-client-react/src/generated/api.schemas";

export const API_BASE = "https://hn3t.pythonanywhere.com/api/v1";

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
      // Dispatch custom event so AuthProvider can catch it and logout
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    
    throw new ApiError(response.status, message);
  }

  return response.json();
}
