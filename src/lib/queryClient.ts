import { QueryClient, QueryCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "./apiClient";
import { triggerSessionExpired } from "@/components/SessionExpiredOverlay";

function handleQueryError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    triggerSessionExpired();
    return;
  }

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
