import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getBackendUserId } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const userId = await getBackendUserId(cookieHeader);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const qs = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) qs.set(k, v);
  const query = qs.toString() ? `?${qs}` : "";

  const res = await fetchBackend(`/portfolio/${userId}/transactions${query}`, {}, cookieHeader);
  return NextResponse.json(await res.json(), { status: res.status });
}
