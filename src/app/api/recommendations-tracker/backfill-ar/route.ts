import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const backendRes = await fetchBackend(
    `/recommendations-tracker/backfill-ar`,
    { method: "POST", body: "{}" },
    cookieHeader,
  );

  if (!backendRes.ok) {
    const errBody = await backendRes.json().catch(() => ({}));
    return NextResponse.json({ success: false, ...errBody }, { status: backendRes.status });
  }

  const respBody = await backendRes.json();
  return NextResponse.json({ success: true, data: respBody.data ?? respBody });
}
