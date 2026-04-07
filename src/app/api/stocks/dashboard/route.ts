import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const backendRes = await fetchBackend("/stocks/dashboard", {}, cookieHeader);

  if (!backendRes.ok) {
    const body = await backendRes.json().catch(() => ({}));
    return NextResponse.json({ success: false, ...body }, { status: backendRes.status });
  }

  const body = await backendRes.json();
  return NextResponse.json({ success: true, data: body });
}
