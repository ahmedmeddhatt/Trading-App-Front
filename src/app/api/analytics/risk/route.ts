import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getBackendUserId } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const userId = await getBackendUserId(cookieHeader);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const queryString = req.nextUrl.search;
  const res = await fetchBackend(`/portfolio/${userId}/risk${queryString}`, {}, cookieHeader);
  return NextResponse.json(await res.json(), { status: res.status });
}
