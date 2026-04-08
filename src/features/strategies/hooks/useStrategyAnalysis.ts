"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { StrategyAnalysisResult } from "@/components/StrategyResultCard";

interface StrategyAnalysisResponse {
  results: StrategyAnalysisResult[];
}

export function useStrategyAnalysis() {
  return useMutation<
    StrategyAnalysisResult[],
    Error,
    { strategyId: string; symbols: string[]; horizon?: string }
  >({
    mutationFn: async (params) => {
      const res = await apiClient.post<StrategyAnalysisResponse>(
        "/api/stocks/strategy-analysis",
        params
      );
      return res.results;
    },
  });
}
