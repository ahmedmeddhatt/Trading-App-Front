"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, TrendingUp, Clock, Check, BarChart3, Coins } from "lucide-react";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { useTradingModeStore } from "@/store/useTradingMode";

type Horizon = "SPECULATION" | "MID_TERM" | "LONG_TERM";
type TradingMode = "STOCKS" | "GOLD";

interface User {
  id: string;
  email: string;
  name?: string;
  investmentHorizon?: Horizon | null;
  tradingMode?: TradingMode;
}

const HORIZONS: { value: Horizon; label: string; description: string; icon: typeof Target }[] = [
  {
    value: "SPECULATION",
    label: "Speculation",
    description: "Short-term momentum trades (days to weeks). Signals emphasize RSI, MACD, and recent price action.",
    icon: TrendingUp,
  },
  {
    value: "MID_TERM",
    label: "Mid-term",
    description: "Balanced analysis (weeks to months). Considers both technical and fundamental factors equally.",
    icon: Target,
  },
  {
    value: "LONG_TERM",
    label: "Long-term",
    description: "Investment-focused (months to years). Emphasizes fundamentals, P/E ratios, sector trends, and SMA200.",
    icon: Clock,
  },
];

const TRADING_MODES: { value: TradingMode; label: string; description: string; icon: typeof BarChart3 }[] = [
  {
    value: "STOCKS",
    label: "Stocks",
    description: "Egyptian Stock Exchange (EGX) analysis — live prices, technical indicators, AI signals, and portfolio tracking.",
    icon: BarChart3,
  },
  {
    value: "GOLD",
    label: "Gold",
    description: "Egyptian gold market analysis — all karats (24K, 21K, 18K, 14K), gold bars, gold pounds, with AI insights.",
    icon: Coins,
  },
];

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const setGlobalMode = useTradingModeStore((s) => s.setMode);
  const router = useRouter();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.get<User>("/api/auth/me"),
    retry: 1,
  });

  const [selected, setSelected] = useState<Horizon>("MID_TERM");
  const [selectedMode, setSelectedMode] = useState<TradingMode>("STOCKS");
  const [saved, setSaved] = useState(false);
  const [modeSaved, setModeSaved] = useState(false);

  useEffect(() => {
    if (user?.investmentHorizon) setSelected(user.investmentHorizon);
    if (user?.tradingMode) {
      setSelectedMode(user.tradingMode);
      setGlobalMode(user.tradingMode);
    }
  }, [user, setGlobalMode]);

  const horizonMutation = useMutation({
    mutationFn: (horizon: Horizon) =>
      apiClient.patch("/api/users/preferences", { investmentHorizon: horizon }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["ai-signal"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const modeMutation = useMutation({
    mutationFn: (tradingMode: TradingMode) =>
      apiClient.patch("/api/users/preferences", { tradingMode }),
    onSuccess: (_data, tradingMode) => {
      setGlobalMode(tradingMode);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      queryClient.invalidateQueries({ queryKey: ["gold"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      router.push("/dashboard");
    },
  });

  const handleSaveHorizon = () => horizonMutation.mutate(selected);
  const handleSaveMode = () => modeMutation.mutate(selectedMode);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white dark:text-white text-gray-900">Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your trading preferences</p>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-48" />
            <div className="h-32 bg-gray-800 rounded" />
          </div>
        ) : (
          <>
            {/* User Info */}
            <div className="bg-gray-900 dark:bg-gray-900 bg-white rounded-xl p-5 border border-transparent dark:border-transparent border-gray-200">
              <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Account</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="text-white dark:text-white text-gray-900">{user?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="text-white dark:text-white text-gray-900">{user?.email || "—"}</span>
                </div>
              </div>
            </div>

            {/* Trading Mode */}
            <div className="bg-gray-900 dark:bg-gray-900 bg-white rounded-xl p-5 space-y-4 border border-transparent dark:border-transparent border-gray-200">
              <div>
                <h2 className="text-sm text-gray-500 uppercase tracking-wider">Trading Mode</h2>
                <p className="text-xs text-gray-600 mt-1">
                  Switch between stock market and gold market analysis across all pages.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {TRADING_MODES.map(({ value, label, description, icon: Icon }) => {
                  const isSelected = selectedMode === value;
                  const isGold = value === "GOLD";
                  const accentColor = isGold ? "amber" : "emerald";
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedMode(value)}
                      className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all text-center ${
                        isSelected
                          ? isGold
                            ? "border-amber-500 bg-amber-500/10"
                            : "border-emerald-500 bg-emerald-500/10"
                          : "border-gray-800 dark:border-gray-800 border-gray-200 bg-gray-800/30 dark:bg-gray-800/30 bg-gray-50 hover:border-gray-700 dark:hover:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className={`p-3 rounded-lg ${
                        isSelected
                          ? isGold
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-800 dark:bg-gray-800 bg-gray-100 text-gray-500"
                      }`}>
                        <Icon size={28} />
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`font-semibold text-base ${
                            isSelected
                              ? isGold ? "text-amber-400" : "text-emerald-400"
                              : "text-white dark:text-white text-gray-900"
                          }`}>
                            {label}
                          </span>
                          {isSelected && (
                            <Check size={16} className={isGold ? "text-amber-500" : "text-emerald-500"} />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleSaveMode}
                disabled={modeMutation.isPending || selectedMode === user?.tradingMode}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                  modeSaved
                    ? selectedMode === "GOLD"
                      ? "bg-amber-600 text-white"
                      : "bg-emerald-600 text-white"
                    : selectedMode === user?.tradingMode
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : selectedMode === "GOLD"
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {modeSaved ? "Saved!" : modeMutation.isPending ? "Switching..." : "Switch Mode"}
              </button>
            </div>

            {/* Investment Horizon */}
            <div className="bg-gray-900 dark:bg-gray-900 bg-white rounded-xl p-5 space-y-4 border border-transparent dark:border-transparent border-gray-200">
              <div>
                <h2 className="text-sm text-gray-500 uppercase tracking-wider">Investment Horizon</h2>
                <p className="text-xs text-gray-600 mt-1">
                  This affects how AI analyzes {selectedMode === "GOLD" ? "gold" : "stocks"} and generates recommendations for you.
                </p>
              </div>

              <div className="grid gap-3">
                {HORIZONS.map(({ value, label, description, icon: Icon }) => {
                  const isSelected = selected === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setSelected(value)}
                      className={`relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-gray-800 dark:border-gray-800 border-gray-200 bg-gray-800/30 dark:bg-gray-800/30 bg-gray-50 hover:border-gray-700 dark:hover:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-800 dark:bg-gray-800 bg-gray-100 text-gray-500"}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isSelected ? "text-emerald-400" : "text-white dark:text-white text-gray-900"}`}>
                            {label}
                          </span>
                          {isSelected && (
                            <span className="text-emerald-500">
                              <Check size={16} />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleSaveHorizon}
                disabled={horizonMutation.isPending || selected === user?.investmentHorizon}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                  saved
                    ? "bg-emerald-600 text-white"
                    : selected === user?.investmentHorizon
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {saved ? "Saved!" : horizonMutation.isPending ? "Saving..." : "Save Preference"}
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
