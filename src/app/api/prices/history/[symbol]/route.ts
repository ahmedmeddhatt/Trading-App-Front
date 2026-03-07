import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const cookieHeader = req.headers.get("cookie") ?? "";

  const queryString = req.nextUrl.search;
  const backendRes = await fetchBackend(
    `/stocks/${encodeURIComponent(symbol.toUpperCase())}/history${queryString}`,
    {},
    cookieHeader
  );

  if (!backendRes.ok) {
    // Return empty array so the chart gracefully shows "No data"
    return NextResponse.json({ success: true, data: [] });
  }

  const body = await backendRes.json();
  return NextResponse.json(body);
}
