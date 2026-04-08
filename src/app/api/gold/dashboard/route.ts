import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const backendRes = await fetchBackend("/gold/dashboard", {}, cookieHeader);
  const body = await backendRes.json();
  return NextResponse.json(
    { success: backendRes.ok, data: body.data ?? body },
    { status: backendRes.status }
  );
}
