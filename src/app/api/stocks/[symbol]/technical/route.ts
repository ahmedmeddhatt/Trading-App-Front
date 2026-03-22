import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const res = await fetchBackend(`/stocks/${symbol.toUpperCase()}/technical`);
  return NextResponse.json(await res.json(), { status: res.status });
}
