import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const res = await fetchBackend(`/stocks/${symbol.toUpperCase()}/technical`);
  const body = await res.json();
  return NextResponse.json({ success: true, data: body.data ?? body }, { status: res.status });
}
