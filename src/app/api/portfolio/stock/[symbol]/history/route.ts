import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getBackendUserId } from "@/lib/proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const userId = await getBackendUserId(cookieHeader);
  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const backendRes = await fetchBackend(
    `/portfolio/${userId}/stock/${encodeURIComponent(symbol.toUpperCase())}/history`,
    {},
    cookieHeader
  );

  if (!backendRes.ok) {
    return NextResponse.json({ success: true, data: { transactions: [], summary: {} } });
  }

  const body = await backendRes.json();
  const data = body?.data ?? {};
  const transactions = (data.transactions ?? []).map(
    (t: Record<string, unknown>) => ({
      ...t,
      quantity: parseFloat(String(t.quantity)),
      price: parseFloat(String(t.price)),
      total: parseFloat(String(t.total)),
      timestamp: t.createdAt,
    })
  );
  return NextResponse.json({ success: true, data: { ...data, transactions } });
}
