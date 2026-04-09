import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const backendRes = await fetchBackend("/gold/refresh", { method: "POST" }, cookieHeader);
  const body = await backendRes.json();
  return NextResponse.json(
    { success: backendRes.ok, data: body.data ?? body },
    { status: backendRes.status }
  );
}
