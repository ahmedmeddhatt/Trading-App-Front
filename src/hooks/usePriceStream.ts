"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiEnvelope } from "@/lib/apiClient";

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

const MAX_RETRIES = 5;

export function usePriceStream(symbol: string) {
  const queryClient = useQueryClient();
  const retries = useRef(0);
  const esRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(`/api/prices?symbol=${encodeURIComponent(symbol)}`);
    esRef.current = es;

    es.onmessage = (event) => {
      retries.current = 0; // reset backoff on successful message
      try {
        // Backend wraps payload in { success: true, data: { ... } }
        const envelope: ApiEnvelope<PriceData> = JSON.parse(event.data);

        if (!envelope.success || !envelope.data) {
          console.warn(
            `[usePriceStream] Non-success envelope for ${symbol}:`,
            envelope.error
          );
          return;
        }

        queryClient.setQueryData(["price", symbol], envelope.data);
      } catch {
        // malformed message — ignore
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;

      if (retries.current >= MAX_RETRIES) {
        toast.error(`Price stream lost for ${symbol}`, {
          description: "Max reconnection attempts reached. Refresh to retry.",
        });
        return;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30s)
      const delay = Math.min(1000 * Math.pow(2, retries.current), 30_000);
      retries.current += 1;

      timeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [symbol, queryClient]);

  useEffect(() => {
    retries.current = 0;
    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [connect]);

  return queryClient.getQueryData<PriceData>(["price", symbol]) ?? null;
}
