import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const horizon = req.nextUrl.searchParams.get("horizon") ?? "MID_TERM";
  const res = await fetchBackend(
    `/stocks/${symbol.toUpperCase()}/signal?horizon=${horizon}`,
    {},
    cookieHeader,
  );
  const body = await res.json();
  return NextResponse.json({ success: true, data: body.data ?? body }, { status: res.status });
}
