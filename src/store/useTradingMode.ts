"use client";

import { create } from "zustand";

type TradingMode = "STOCKS" | "GOLD";

interface TradingModeState {
  mode: TradingMode;
  setMode: (mode: TradingMode) => void;
}

export const useTradingModeStore = create<TradingModeState>((set) => ({
  mode: "STOCKS",
  setMode: (mode) => set({ mode }),
}));

/** Hook for components to read/set trading mode */
export function useTradingMode() {
  return useTradingModeStore();
}

/** Returns "GOLD" or "STOCK" for API query params */
export function useAssetType(): "GOLD" | "STOCK" {
  return useTradingModeStore((s) => s.mode === "GOLD" ? "GOLD" : "STOCK");
}

/** Appends assetType= to a URL string that already has ? or needs one */
export function withAssetType(url: string, assetType: string): string {
  return url.includes("?") ? `${url}&assetType=${assetType}` : `${url}?assetType=${assetType}`;
}
