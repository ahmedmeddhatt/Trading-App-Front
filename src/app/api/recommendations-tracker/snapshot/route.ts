import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const body = await req.json().catch(() => ({}));
  const backendRes = await fetchBackend(
    `/recommendations-tracker/snapshot`,
    { method: "POST", body: JSON.stringify(body ?? {}) },
    cookieHeader,
  );

  if (!backendRes.ok) {
    const errBody = await backendRes.json().catch(() => ({}));
    return NextResponse.json({ success: false, ...errBody }, { status: backendRes.status });
  }

  const respBody = await backendRes.json();
  return NextResponse.json({ success: true, data: respBody.data ?? respBody });
}
