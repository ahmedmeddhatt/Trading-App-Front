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
