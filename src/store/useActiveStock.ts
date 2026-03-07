"use client";

import { create } from "zustand";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface ActiveStockState {
  symbol: string;
  setSymbol: (symbol: string) => void;
}

const useActiveStockStore = create<ActiveStockState>((set) => ({
  symbol: "COMI",
  setSymbol: (symbol) => set({ symbol }),
}));

/**
 * Hook that syncs the active stock symbol with the URL path.
 * URL pattern: /dashboard/[symbol]
 */
export function useActiveStock() {
  const router = useRouter();
  const pathname = usePathname();
  const { symbol, setSymbol: setStoreSymbol } = useActiveStockStore();

  // Hydrate symbol from URL on mount / path change
  useEffect(() => {
    const segments = pathname.split("/");
    const urlSymbol = segments[2]; // /dashboard/[symbol]
    if (urlSymbol && urlSymbol !== symbol) {
      setStoreSymbol(urlSymbol.toUpperCase());
    }
  }, [pathname, symbol, setStoreSymbol]);

  const setSymbol = (newSymbol: string) => {
    const upper = newSymbol.toUpperCase();
    setStoreSymbol(upper);
    router.push(`/dashboard/${upper}`);
  };

  return { symbol, setSymbol };
}
