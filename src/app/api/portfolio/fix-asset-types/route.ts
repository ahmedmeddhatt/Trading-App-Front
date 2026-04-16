import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getBackendUserId } from "@/lib/proxy";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const userId = await getBackendUserId(cookieHeader);
  if (!userId) return NextResponse.json({ success: false }, { status: 401 });

  const res = await fetchBackend(`/portfolio/${userId}/fix-asset-types`, { method: "POST" }, cookieHeader);
  const body = await res.json();
  return NextResponse.json(body, { status: res.status });
}
