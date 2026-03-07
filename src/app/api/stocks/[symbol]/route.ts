import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const cookieHeader = req.headers.get("cookie") ?? "";

  const backendRes = await fetchBackend(
    `/stocks/${encodeURIComponent(symbol.toUpperCase())}`,
    {},
    cookieHeader
  );

  if (!backendRes.ok) {
    const body = await backendRes.json().catch(() => ({}));
    return NextResponse.json(body, { status: backendRes.status });
  }

  const body = await backendRes.json();
  return NextResponse.json(body);
}
