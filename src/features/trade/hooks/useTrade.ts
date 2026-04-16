"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/apiClient";

export interface TradePayload {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fees?: number;
  date?: string;
  assetType?: "STOCK" | "GOLD";
}

export interface TradeResponse {
  orderId: string;
  status: "filled" | "pending" | "rejected";
  clientMutationId: string;
}

export function useTrade() {
  const queryClient = useQueryClient();
  const clientMutationId = useRef<string>(uuidv4());

  const mutation = useMutation<TradeResponse, ApiError, TradePayload>({
    mutationFn: (payload) =>
      apiClient.post<TradeResponse>("/api/trade", {
        ...payload,
        clientMutationId: clientMutationId.current,
      }),

    onSuccess: (data, variables) => {
      // Rotate ID so the next submission gets a fresh idempotency key
      clientMutationId.current = uuidv4();

      // Invalidate all portfolio + gold queries so both modes refresh correctly
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      if (variables.assetType === "GOLD") {
        queryClient.invalidateQueries({ queryKey: ["gold"] });
      }

      toast.success("Order placed", {
        description: `Order ${data.orderId} is ${data.status}.`,
      });
    },

    onError: (error) => {
      // error is always ApiError — surface backend message + correlation ID
      const description = error.correlationId
        ? `Ref: ${error.correlationId}`
        : undefined;

      toast.error(error.message, { description });
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
