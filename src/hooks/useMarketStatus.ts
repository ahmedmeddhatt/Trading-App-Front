"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMarketStatus, formatCountdown, type MarketStatus } from "@/lib/marketHours";
import { apiClient } from "@/lib/apiClient";

export interface MarketStatusResult extends MarketStatus {
  countdown: string;
}

const CLOSED_DEFAULT: MarketStatus = {
  label: "Closed",
  isOpen: false,
  nextOpenMs: 0,
  closesInMs: 0,
};

export function useMarketStatus(): MarketStatusResult {
  // Null on server to avoid SSR/hydration mismatch (Date.now() differs)
  const [localStatus, setLocalStatus] = useState<MarketStatus | null>(null);

  // Set status client-side only, update every second
  useEffect(() => {
    setLocalStatus(getMarketStatus());
    const id = setInterval(() => setLocalStatus(getMarketStatus()), 1000);
    return () => clearInterval(id);
  }, []);

  // Server-authoritative market status — refetch every 60s
  useQuery({
    queryKey: ["market-status"],
    queryFn: () => apiClient.get("/api/market-status"),
    refetchInterval: 60_000,
  });

  const status = localStatus ?? CLOSED_DEFAULT;
  const countdown = status.isOpen
    ? formatCountdown(status.closesInMs)
    : formatCountdown(status.nextOpenMs);

  return { ...status, countdown };
}
