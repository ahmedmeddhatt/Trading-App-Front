import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getBackendUserId } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const userId = await getBackendUserId(cookieHeader);
  if (!userId)
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const res = await fetchBackend(`/portfolio/${userId}/closed-positions`, {}, cookieHeader);
  if (!res.ok) return NextResponse.json([], { status: res.status });
  return NextResponse.json(await res.json());
}
