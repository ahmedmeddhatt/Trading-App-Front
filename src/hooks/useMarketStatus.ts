"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMarketStatus, formatCountdown, type MarketStatus } from "@/lib/marketHours";
import { apiClient } from "@/lib/apiClient";

export interface MarketStatusResult extends MarketStatus {
  countdown: string;
}

export function useMarketStatus(): MarketStatusResult {
  const [localStatus, setLocalStatus] = useState<MarketStatus>(() => getMarketStatus());

  // Live countdown — updates every second client-side
  useEffect(() => {
    const id = setInterval(() => {
      setLocalStatus(getMarketStatus());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Server-authoritative market status — refetch every 60s
  useQuery({
    queryKey: ["market-status"],
    queryFn: () => apiClient.get("/api/market-status"),
    refetchInterval: 60_000,
  });

  const countdown = localStatus.isOpen
    ? formatCountdown(localStatus.closesInMs)
    : formatCountdown(localStatus.nextOpenMs);

  return { ...localStatus, countdown };
}
