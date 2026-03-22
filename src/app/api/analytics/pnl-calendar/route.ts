import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getBackendUserId } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const userId = await getBackendUserId(cookieHeader);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const year = new URL(req.url).searchParams.get("year") ?? new Date().getFullYear().toString();
  const res = await fetchBackend(`/portfolio/${userId}/pnl-calendar?year=${year}`, {}, cookieHeader);
  return NextResponse.json(await res.json(), { status: res.status });
}
