"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface PriceEvent {
  symbol: string;
  price: number;
  changePercent: number;
  lastUpdate: string;
  recommendation?: string;
  signals?: {
    daily: string | null;
    weekly: string | null;
    monthly: string | null;
  };
}

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string | number;
}

const MAX_RETRIES = 5;

export function usePriceStream(symbols: string[]) {
  const queryClient = useQueryClient();
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const mountedRef = useRef(true);
  const esMap = useRef<Map<string, EventSource>>(new Map());
  const retriesMap = useRef<Map<string, number>>(new Map());
  const timeoutsMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Stable ref so connectSymbol can always access the latest deps without stale closures
  const connectSymbol = useRef((symbol: string) => {
    if (!mountedRef.current) return;

    const es = new EventSource(`/api/prices?symbol=${encodeURIComponent(symbol)}`);
    esMap.current.set(symbol, es);

    es.onmessage = (event) => {
      if (!mountedRef.current) return;
      retriesMap.current.set(symbol, 0);
      try {
        const evt: PriceEvent = JSON.parse(event.data);
        const data: PriceData = {
          symbol: evt.symbol,
          price: evt.price,
          change: 0,
          changePercent: evt.changePercent,
          timestamp: evt.lastUpdate,
        };
        setPrices((prev) => ({ ...prev, [symbol]: data }));
        queryClient.setQueryData(["price", symbol], data);
      } catch {
        // malformed message — ignore
      }
    };

    es.onerror = () => {
      es.close();
      esMap.current.delete(symbol);
      if (!mountedRef.current) return;

      const retries = retriesMap.current.get(symbol) ?? 0;
      if (retries >= MAX_RETRIES) {
        toast.error(`Price stream lost for ${symbol}`, {
          description: "Max reconnection attempts reached. Refresh to retry.",
        });
        return;
      }

      retriesMap.current.set(symbol, retries + 1);
      const delay = Math.min(1000 * Math.pow(2, retries), 30_000);
      const t = setTimeout(() => connectSymbol.current(symbol), delay);
      timeoutsMap.current.set(symbol, t);
    };
  });

  // Update queryClient ref on each render so the closure stays fresh
  useEffect(() => {
    connectSymbol.current = (symbol: string) => {
      if (!mountedRef.current) return;

      const es = new EventSource(`/api/prices?symbol=${encodeURIComponent(symbol)}`);
      esMap.current.set(symbol, es);

      es.onmessage = (event) => {
        if (!mountedRef.current) return;
        retriesMap.current.set(symbol, 0);
        try {
          const evt: PriceEvent = JSON.parse(event.data);
          const data: PriceData = {
            symbol: evt.symbol,
            price: evt.price,
            change: 0,
            changePercent: evt.changePercent,
            timestamp: evt.lastUpdate,
          };
          setPrices((prev) => ({ ...prev, [symbol]: data }));
          queryClient.setQueryData(["price", symbol], data);
        } catch {}
      };

      es.onerror = () => {
        es.close();
        esMap.current.delete(symbol);
        if (!mountedRef.current) return;

        const retries = retriesMap.current.get(symbol) ?? 0;
        if (retries >= MAX_RETRIES) {
          toast.error(`Price stream lost for ${symbol}`, {
            description: "Max reconnection attempts reached. Refresh to retry.",
          });
          return;
        }

        retriesMap.current.set(symbol, retries + 1);
        const delay = Math.min(1000 * Math.pow(2, retries), 30_000);
        const t = setTimeout(() => connectSymbol.current(symbol), delay);
        timeoutsMap.current.set(symbol, t);
      };
    };
  });

  const symbolsKey = [...symbols].sort().join(",");

  // Mount/unmount lifecycle — close all connections only on true unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const es of esMap.current.values()) es.close();
      for (const t of timeoutsMap.current.values()) clearTimeout(t);
      esMap.current.clear();
      timeoutsMap.current.clear();
      retriesMap.current.clear();
    };
  }, []);

  // Manage connections when symbol set changes
  useEffect(() => {
    const activeSet = new Set(symbols);

    // Close removed symbols
    for (const [sym, es] of esMap.current.entries()) {
      if (!activeSet.has(sym)) {
        es.close();
        esMap.current.delete(sym);
        const t = timeoutsMap.current.get(sym);
        if (t) { clearTimeout(t); timeoutsMap.current.delete(sym); }
      }
    }

    // Connect new symbols only
    for (const sym of symbols) {
      if (!esMap.current.has(sym)) {
        retriesMap.current.set(sym, 0);
        connectSymbol.current(sym);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return {
    prices,
    loading: symbols.length > 0 && symbols.some((s) => !(s in prices)),
    error: false,
  };
}
