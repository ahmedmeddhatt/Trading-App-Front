import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const aiProvider = req.nextUrl.searchParams.get("aiProvider");
  const qs = aiProvider ? `?aiProvider=${encodeURIComponent(aiProvider)}` : "";
  const backendRes = await fetchBackend(
    `/recommendations-tracker/snapshots${qs}`,
    {},
    cookieHeader,
  );

  if (!backendRes.ok) {
    const body = await backendRes.json().catch(() => ({}));
    return NextResponse.json({ success: false, ...body }, { status: backendRes.status });
  }

  const body = await backendRes.json();
  return NextResponse.json({ success: true, data: body.data ?? body });
}
