"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useTradingModeStore } from "@/store/useTradingMode";

export interface Position {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface Portfolio {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  positions: Position[];
}

export function usePortfolio() {
  const mode = useTradingModeStore((s) => s.mode);
  const assetType = mode === "GOLD" ? "GOLD" : "STOCK";
  return useQuery<Portfolio>({
    queryKey: ["portfolio", assetType],
    queryFn: () => apiClient.get<Portfolio>(`/api/portfolio?assetType=${assetType}`),
    refetchInterval: 30_000,
  });
}
