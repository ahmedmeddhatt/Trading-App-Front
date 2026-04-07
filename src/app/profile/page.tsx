"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, TrendingUp, Clock, Check } from "lucide-react";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";

type Horizon = "SPECULATION" | "MID_TERM" | "LONG_TERM";

interface User {
  id: string;
  email: string;
  name?: string;
  investmentHorizon?: Horizon | null;
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

export default function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.get<User>("/api/auth/me"),
    retry: 1,
  });

  const [selected, setSelected] = useState<Horizon>("MID_TERM");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.investmentHorizon) {
      setSelected(user.investmentHorizon);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: (horizon: Horizon) =>
      apiClient.patch("/api/users/preferences", { investmentHorizon: horizon }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["ai-signal"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    mutation.mutate(selected);
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
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
            <div className="bg-gray-900 rounded-xl p-5">
              <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Account</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="text-white">{user?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="text-white">{user?.email || "—"}</span>
                </div>
              </div>
            </div>

            {/* Investment Horizon */}
            <div className="bg-gray-900 rounded-xl p-5 space-y-4">
              <div>
                <h2 className="text-sm text-gray-500 uppercase tracking-wider">Investment Horizon</h2>
                <p className="text-xs text-gray-600 mt-1">
                  This affects how AI analyzes stocks and generates recommendations for you.
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
                          : "border-gray-800 bg-gray-800/30 hover:border-gray-700"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-800 text-gray-500"}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isSelected ? "text-emerald-400" : "text-white"}`}>
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
                onClick={handleSave}
                disabled={mutation.isPending || selected === user?.investmentHorizon}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                  saved
                    ? "bg-emerald-600 text-white"
                    : selected === user?.investmentHorizon
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {saved ? "Saved!" : mutation.isPending ? "Saving..." : "Save Preference"}
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
