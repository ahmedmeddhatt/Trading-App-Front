import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getBackendUserId } from "@/lib/proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const userId = await getBackendUserId(cookieHeader);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const res = await fetchBackend(`/portfolio/${userId}/positions/${symbol.toUpperCase()}/detail`, {}, cookieHeader);
  return NextResponse.json(await res.json(), { status: res.status });
}
