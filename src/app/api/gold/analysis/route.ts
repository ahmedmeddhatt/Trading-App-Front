import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const body = await req.json();
  const backendRes = await fetchBackend("/gold/analysis", {
    method: "POST",
    body: JSON.stringify(body),
  }, cookieHeader);
  const resBody = await backendRes.json();
  return NextResponse.json(
    { success: backendRes.ok, data: resBody.data ?? resBody },
    { status: backendRes.status }
  );
}
