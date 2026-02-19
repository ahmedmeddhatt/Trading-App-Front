import { QueryClient, QueryCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "./apiClient";

function handleQueryError(error: unknown) {
  // 401 is handled by apiClient redirect — skip toast
  if (error instanceof ApiError && error.status === 401) return;

  const msg = error instanceof ApiError ? error.message : "An error occurred";
  const correlationId = error instanceof ApiError ? error.correlationId : undefined;

  toast.error(msg, {
    description: correlationId ? `Ref: ${correlationId}` : undefined,
  });
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleQueryError }),
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 60_000,
      retry: 1,
    },
  },
});
