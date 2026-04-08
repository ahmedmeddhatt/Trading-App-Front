"use client";

import { useEffect } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { useTradingModeStore } from "@/store/useTradingMode";
import { apiClient } from "@/lib/apiClient";

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster position="bottom-right" theme={theme} richColors closeButton />;
}

/** Syncs trading mode from user profile to Zustand store */
function TradingModeSync() {
  const setMode = useTradingModeStore((s) => s.setMode);
  const { data } = useQuery<{ tradingMode?: "STOCKS" | "GOLD" }>({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.get("/api/auth/me"),
    retry: false,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (data?.tradingMode) setMode(data.tradingMode);
  }, [data?.tradingMode, setMode]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TradingModeSync />
          {children}
          <ThemedToaster />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
