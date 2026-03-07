import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const search = req.nextUrl.search; // forward all query params (search, sector, minPE, maxPE, page, limit)
  const backendRes = await fetchBackend(`/stocks${search}`, {}, cookieHeader);

  if (!backendRes.ok) {
    const body = await backendRes.json().catch(() => ({}));
    return NextResponse.json(body, { status: backendRes.status });
  }

  const body = await backendRes.json();
  return NextResponse.json(body);
}
