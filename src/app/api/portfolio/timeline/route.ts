import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";
import { getUserIdFromCookieHeader } from "@/lib/decodeJwt";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const userId = getUserIdFromCookieHeader(cookieHeader);
  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.search;
  const backendRes = await fetchBackend(`/portfolio/${userId}/timeline${params}`, {}, cookieHeader);

  if (!backendRes.ok) {
    return NextResponse.json({ success: true, data: [] });
  }

  const body = await backendRes.json();
  const timeline = body?.data?.timeline ?? [];
  return NextResponse.json({ success: true, data: timeline });
}
