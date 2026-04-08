import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const body = await req.json();
  const res = await fetchBackend(
    "/stocks/strategy-analysis",
    { method: "POST", body: JSON.stringify(body) },
    cookieHeader,
  );
  const data = await res.json();
  return NextResponse.json({ success: true, data: data.data ?? data }, { status: res.status });
}
