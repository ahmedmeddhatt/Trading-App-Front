"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, DollarSign, Clock, Globe, Briefcase,
  Loader2, ChevronDown, ChevronUp, Coins, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";

const GOLD_STRATEGIES: {
  id: string;
  title: string;
  titleAr: string;
  icon: LucideIcon;
  description: string;
  descriptionAr: string;
  color: string;
}[] = [
  {
    id: "gold-trend",
    title: "Price Trend Analysis",
    titleAr: "تحليل اتجاه السعر",
    icon: TrendingUp,
    description: "Analyze gold price trends, momentum, and directional strength across timeframes.",
    descriptionAr: "تحليل اتجاهات أسعار الذهب والزخم وقوة الاتجاه عبر الأطر الزمنية.",
    color: "amber",
  },
  {
    id: "gold-value",
    title: "Value & Premium Analysis",
    titleAr: "تحليل القيمة والعلاوة",
    icon: DollarSign,
    description: "Analyze dealer premium, buy/sell spread, and which karat offers best value.",
    descriptionAr: "تحليل هامش التاجر وفارق البيع والشراء وأي عيار يقدم أفضل قيمة.",
    color: "emerald",
  },
  {
    id: "gold-timing",
    title: "Entry/Exit Timing",
    titleAr: "توقيت الدخول والخروج",
    icon: Clock,
    description: "Identify optimal entry and exit points based on cycles and market positioning.",
    descriptionAr: "تحديد نقاط الدخول والخروج المثلى بناءً على الدورات والوضع السوقي.",
    color: "blue",
  },
  {
    id: "gold-macro",
    title: "Macro Factor Analysis",
    titleAr: "تحليل العوامل الكلية",
    icon: Globe,
    description: "Analyze EGP stability, inflation, USD/EGP trends, and geopolitical risks.",
    descriptionAr: "تحليل استقرار الجنيه والتضخم واتجاهات الدولار والمخاطر الجيوسياسية.",
    color: "purple",
  },
  {
    id: "gold-portfolio",
    title: "Portfolio Allocation",
    titleAr: "تخصيص المحفظة",
    icon: Briefcase,
    description: "Evaluate gold allocation, diversification benefits, and risk reduction.",
    descriptionAr: "تقييم تخصيص الذهب وفوائد التنويع وتقليل المخاطر.",
    color: "orange",
  },
];

const GOLD_CATEGORIES = [
  { id: "GOLD_24K", label: "24K Gold", labelAr: "عيار 24" },
  { id: "GOLD_21K", label: "21K Gold", labelAr: "عيار 21" },
  { id: "GOLD_18K", label: "18K Gold", labelAr: "عيار 18" },
  { id: "GOLD_14K", label: "14K Gold", labelAr: "عيار 14" },
  { id: "GOLD_BAR", label: "Gold Bar", labelAr: "سبيكة ذهب" },
  { id: "GOLD_POUND", label: "Gold Pound", labelAr: "جنيه ذهب" },
  { id: "GOLD_OUNCE", label: "Gold Ounce", labelAr: "أونصة ذهب" },
];

export default function GoldStrategies() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("GOLD_21K");
  const [runningStrategy, setRunningStrategy] = useState<string | null>(null);

  const { data: analysisResult, isLoading: analyzing, refetch } = useQuery({
    queryKey: ["gold", "strategy-analysis", runningStrategy, selectedCategory],
    queryFn: () =>
      apiClient.post<any[]>("/api/gold/analysis", {
        categoryIds: [selectedCategory],
        horizon: "MID_TERM",
      }),
    enabled: !!runningStrategy,
  });

  const handleRun = (strategyId: string) => {
    setRunningStrategy(strategyId);
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Coins className="text-amber-500" size={28} />
            {isAr ? "استراتيجيات تحليل الذهب" : "Gold Analysis Strategies"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isAr ? "تحليل عميق لسوق الذهب المصري" : "Deep analysis of the Egyptian gold market"}
          </p>
        </div>

        {/* Category Selector */}
        <div className="mb-6 flex flex-wrap gap-2">
          {GOLD_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-amber-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {isAr ? cat.labelAr : cat.label}
            </button>
          ))}
        </div>

        {/* Strategy Cards */}
        <div className="space-y-3">
          {GOLD_STRATEGIES.map((strategy) => {
            const isOpen = openId === strategy.id;
            const Icon = strategy.icon;
            const isRunning = runningStrategy === strategy.id && analyzing;

            return (
              <div key={strategy.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : strategy.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-800/50 transition-colors"
                >
                  <div className={`p-2 rounded-lg bg-${strategy.color}-500/20`}>
                    <Icon size={20} className={`text-${strategy.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{isAr ? strategy.titleAr : strategy.title}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">{isAr ? strategy.descriptionAr : strategy.description}</p>
                  </div>
                  {isOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    <button
                      onClick={() => handleRun(strategy.id)}
                      disabled={isRunning}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Coins size={14} />}
                      {isRunning
                        ? (isAr ? "جاري التحليل..." : "Analyzing...")
                        : (isAr ? "تحليل" : "Run Analysis")
                      } — {GOLD_CATEGORIES.find((c) => c.id === selectedCategory)?.[isAr ? "labelAr" : "label"]}
                    </button>

                    {/* Results */}
                    {runningStrategy === strategy.id && analysisResult && !analyzing && (
                      <div className="space-y-3">
                        {(Array.isArray(analysisResult) ? analysisResult : [analysisResult]).map((result: any) => (
                          <div key={result.categoryId} className="bg-gray-800 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-amber-300 font-bold">{result.categoryId}</span>
                              <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                                result.signal === "Hot" ? "bg-emerald-900/40 text-emerald-400" :
                                result.signal === "Cold" ? "bg-red-900/40 text-red-400" :
                                "bg-gray-700 text-gray-300"
                              }`}>
                                {result.signal}
                              </span>
                            </div>
                            <p className="text-white text-sm">{result.summary}</p>
                            {result.reasons?.length > 0 && (
                              <ul className="space-y-0.5">
                                {result.reasons.map((r: string, i: number) => (
                                  <li key={i} className="text-gray-400 text-xs">- {r}</li>
                                ))}
                              </ul>
                            )}
                            {result.outlook && (
                              <p className="text-gray-300 text-xs italic">{result.outlook}</p>
                            )}
                            {result.risks?.length > 0 && (
                              <div className="flex items-start gap-1 mt-1">
                                <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-gray-500 text-xs">{result.risks.join(" · ")}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
