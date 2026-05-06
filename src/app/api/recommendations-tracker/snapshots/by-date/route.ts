import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const date = req.nextUrl.searchParams.get("date") ?? "";
  const lang = req.nextUrl.searchParams.get("lang") ?? "";
  const langQs = lang ? `&lang=${encodeURIComponent(lang)}` : "";
  const backendRes = await fetchBackend(
    `/recommendations-tracker/snapshots/by-date?date=${encodeURIComponent(date)}${langQs}`,
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
