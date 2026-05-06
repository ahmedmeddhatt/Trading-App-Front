import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ pickId: string }> },
) {
  const { pickId } = await context.params;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const lang = req.nextUrl.searchParams.get("lang") ?? "";
  const qs = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  const backendRes = await fetchBackend(
    `/recommendations-tracker/picks/${encodeURIComponent(pickId)}${qs}`,
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
