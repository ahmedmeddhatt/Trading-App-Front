import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";
import { getUserIdFromCookieHeader } from "@/lib/decodeJwt";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const userId = getUserIdFromCookieHeader(cookieHeader);
  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const backendRes = await fetchBackend(`/portfolio/${userId}/allocation`, {}, cookieHeader);

  if (!backendRes.ok) {
    return NextResponse.json({ success: true, data: { bySymbol: [] } });
  }

  const body = await backendRes.json();
  const raw = body?.data ?? { bySymbol: [] };
  return NextResponse.json({
    success: true,
    data: {
      bySymbol: (raw.bySymbol ?? []).map((s: { symbol: string; value: string; percent: string }) => ({
        name: s.symbol,
        value: parseFloat(s.value),
        percentage: parseFloat(s.percent),
      })),
    },
  });
}
