import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "https://trading-app-production-8775.up.railway.app";

/** Strip Domain attribute so the browser sets the cookie on the frontend origin */
function rewriteSetCookie(header: string): string {
  return header.replace(/;\s*domain=[^;]*/gi, "");
}

export async function fetchBackend(
  path: string,
  init: RequestInit = {},
  cookieHeader?: string
): Promise<Response> {
  const url = `${BACKEND}${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      console.error(`[proxy] ${init.method ?? "GET"} ${url} → ${res.status} ${res.statusText}`);
    }
    return res;
  } catch (err) {
    console.error(`[proxy] ${init.method ?? "GET"} ${url} → network error:`, err);
    throw err;
  }
}

/** Forward Set-Cookie headers from the backend response onto a NextResponse */
export function forwardSetCookies(
  nextRes: NextResponse,
  backendRes: Response
): void {
  (backendRes.headers.getSetCookie?.() ?? []).forEach((c) =>
    nextRes.headers.append("Set-Cookie", rewriteSetCookie(c))
  );
}

/** Pass the backend JSON through as-is, forwarding Set-Cookie */
export async function passThrough(backendRes: Response): Promise<NextResponse> {
  const body = await backendRes.json();
  const response = NextResponse.json(body, { status: backendRes.status });
  forwardSetCookies(response, backendRes);
  return response;
}

/** Resolve the current user's ID from the backend session */
export async function getBackendUserId(
  cookieHeader: string
): Promise<string | null> {
  try {
    const res = await fetchBackend("/auth/me", {}, cookieHeader);
    if (!res.ok) return null;
    const body = await res.json();
    return (body.data?.id as string) ?? null;
  } catch {
    return null;
  }
}
