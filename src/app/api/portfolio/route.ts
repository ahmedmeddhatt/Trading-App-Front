import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getBackendUserId } from "@/lib/proxy";

interface BackendPosition {
  symbol: string;
  totalQuantity: number;
  averagePrice: string | number;
}

interface BackendPortfolio {
  totalInvested: string | number;
  positions: BackendPosition[];
}

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";

  const userId = await getBackendUserId(cookieHeader);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 401, message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const search = req.nextUrl.search;
  const backendRes = await fetchBackend(`/portfolio/${userId}${search}`, {}, cookieHeader);
  if (!backendRes.ok) {
    const body = await backendRes.json();
    return NextResponse.json(body, { status: backendRes.status });
  }

  const { data }: { data: BackendPortfolio } = await backendRes.json();

  const totalInvested = parseFloat(String(data.totalInvested));
  const rawPositions = data.positions ?? [];

  // currentPrice uses avgCost as placeholder; live prices arrive via SSE usePriceStream
  const positions = rawPositions.map((p) => {
    const avgCost = parseFloat(String(p.averagePrice));
    const quantity = parseFloat(String(p.totalQuantity));
    return {
      symbol: p.symbol,
      quantity,
      avgCost,
      currentPrice: avgCost,
      pnl: 0,
      pnlPercent: 0,
    };
  });

  const totalValue = parseFloat(
    positions.reduce((sum, p) => sum + p.avgCost * p.quantity, 0).toFixed(2)
  );

  return NextResponse.json({
    success: true,
    data: {
      totalValue,
      totalPnl: 0,
      totalPnlPercent: 0,
      positions,
    },
  });
}
