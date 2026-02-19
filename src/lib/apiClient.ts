/**
 * Pre-configured fetch wrapper.
 * - Always sends cookies (credentials: 'include')
 * - Parses the standardized backend envelope: { success, data, error }
 * - Throws ApiError on non-2xx or success:false so callers get typed error info
 * - Auto-redirects to /login on 401
 */

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    correlationId?: string;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string | undefined,
    public readonly correlationId: string | undefined,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "credentials">;

async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  // Auto-redirect to login on session expiry
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError("Session expired — redirecting to login", "UNAUTHORIZED", undefined, 401);
  }

  // Parse body regardless of status so we can surface backend error details
  let body: ApiEnvelope<T>;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(
      `HTTP ${res.status}: ${res.statusText}`,
      undefined,
      undefined,
      res.status
    );
  }

  // Backend returned success:false or non-2xx HTTP status
  if (!res.ok || body.success === false) {
    const err = body.error;
    throw new ApiError(
      err?.message ?? `Request failed with status ${res.status}`,
      err?.code,
      err?.correlationId,
      res.status
    );
  }

  return body.data as T;
}

export const apiClient = {
  get: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "GET" }),

  post: <T>(url: string, body: unknown, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: <T>(url: string, body: unknown, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "DELETE" }),
};
