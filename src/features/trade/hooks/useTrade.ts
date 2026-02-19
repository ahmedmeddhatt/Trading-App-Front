"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";

export interface TradePayload {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
}

export interface TradeResponse {
  orderId: string;
  status: "filled" | "pending" | "rejected";
  clientMutationId: string;
}

export function useTrade() {
  const queryClient = useQueryClient();
  const clientMutationId = useRef<string>(uuidv4());

  const mutation = useMutation<TradeResponse, Error, TradePayload>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          clientMutationId: clientMutationId.current,
        }),
      });

      if (!res.ok) {
        throw new Error(`Trade failed: ${res.statusText}`);
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Rotate ID so next submission is a fresh idempotency key
      clientMutationId.current = uuidv4();

      // Invalidate portfolio so it refetches updated positions
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });

      return data;
    },
  });

  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
