export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, options = {}) {
  const token = localStorage.getItem("mediqueue-token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.message || "The request could not be completed.", response.status);
  }
  return payload;
}
