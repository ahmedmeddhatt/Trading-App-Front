import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getBackendUserId } from "@/lib/proxy";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const { symbol, side, quantity, price, fees, clientMutationId, date, assetType } = await req.json();

  const userId = await getBackendUserId(cookieHeader);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 401, message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const backendRes = await fetchBackend(
    "/transactions",
    {
      method: "POST",
      body: JSON.stringify({
        userId,
        symbol,
        type: (side as string).toUpperCase(),
        quantity,
        price,
        fees,
        ...(date ? { date } : {}),
        ...(assetType ? { assetType } : {}),
      }),
    },
    cookieHeader
  );

  if (!backendRes.ok) {
    const body = await backendRes.json();
    return NextResponse.json(body, { status: backendRes.status });
  }

  const { data } = await backendRes.json();

  return NextResponse.json({
    success: true,
    data: {
      orderId: data?.id ?? crypto.randomUUID(),
      status: "filled",
      clientMutationId,
    },
  });
}
