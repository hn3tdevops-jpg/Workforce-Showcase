import type { LoginRequest, SwitchBusinessRequest } from "@workspace/api-client-react";

const envBase = import.meta.env.VITE_API_BASE_URL;
// When VITE_API_BASE_URL is set, use it directly (requires CORS on the server).
// When not set, in development use the relative path /api/v1 which is proxied by the Vite dev
// server to https://hn3t.pythonanywhere.com — no CORS issues in development.
// In production, default to the known backend so the frontend targets the correct API origin.
const defaultProdBase = "https://hn3t.pythonanywhere.com";
export const API_BASE = envBase
  ? `${envBase.replace(/\/$/, "")}/api/v1`
  : (import.meta.env.PROD ? `${defaultProdBase}/api/v1` : "/api/v1");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("workforce_token");
  const headers = new Headers(options.headers);
  
  if (token) headers.set("Authorization", `Bearer ${token}`);
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Normalize path to avoid accidental trailing-slash redirects from the server.
  // Ensure leading slash and strip any trailing slashes so '/auth/login/' -> '/auth/login'
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const cleanPath = normalizedPath.replace(/\/+$/, "");
  // keep leading slash, remove trailing slashes ("/auth/login/" -> "/auth/login")
  const finalUrl = `${API_BASE}${cleanPath}`;


  let response: Response;
  try {
    response = await fetch(finalUrl, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const errName = (err as any)?.name ?? "Error";
    const errMsg = (err as any)?.message ?? String(err);
    // Use status 0 to denote network-level failures
    throw new ApiError(0, `Network error when calling ${finalUrl}: ${errMsg}`);
  }

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

  try {
    return response.json();
  } catch (err: unknown) {
    throw new ApiError(response.status || 0, "Invalid JSON in response");
  }
}
