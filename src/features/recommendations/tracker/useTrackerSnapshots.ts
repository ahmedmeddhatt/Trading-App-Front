import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";

export type TrackerStatus =
  | "PENDING"
  | "ENTERED"
  | "T1_HIT"
  | "T2_HIT"
  | "STOPPED"
  | "EXPIRED";

export interface TrackedPickPerformance {
  status: TrackerStatus;
  isClosed: boolean;
  entryHit: boolean;
  entryHitAt: string | null;
  t1Hit: boolean;
  t1HitAt: string | null;
  t2Hit: boolean;
  t2HitAt: string | null;
  stopHit: boolean;
  stopHitAt: string | null;
  latestPrice: number | null;
  latestPriceAt: string | null;
  peakPrice: number | null;
  troughPrice: number | null;
  returnPct: number | null;
  daysToT1: number | null;
  daysToT2: number | null;
  daysToStop: number | null;
  evaluationCount: number;
  lastEvaluatedAt: string;
}

export interface TrackedPick {
  id: string;
  rank: number;
  symbol: string;
  // Per-pick AI source (added for daily multi-provider mode). Falls back to the
  // snapshot-level provider for legacy weekly picks.
  aiProvider?: string;
  aiModel?: string;
  company: string;
  sector: string;
  currentPrice: number;
  status: string;
  support: { s1: number; s2: number };
  resistance: { r1: number; r2: number };
  trend: string;
  pattern: string | null;
  indicators: {
    rsi: number;
    rsiStatus: string;
    macd: string;
    volume: string;
    ma20: number;
    ma50: number;
  };
  entry: number;
  targets: { t1: number; t2: number };
  stopLoss: number;
  riskReward: string;
  timeframe: string;
  confidence: number;
  catalysts: string;
  risks: string;
  performance: TrackedPickPerformance | null;
}

export interface SnapshotSummary {
  id: string;
  // Calendar date the snapshot represents. `weekStartDate` is kept as an alias
  // for back-compat with existing UI code; both hold the same string.
  weekStartDate: string;
  snapshotDate: string;
  kind: "daily" | "weekly";
  generatedAt: string;
  expiresAt: string;
  aiProvider: string;
  aiModel: string;
  marketCondition: string;
  pickCount: number;
  summaryStats: {
    t1Hits: number;
    t2Hits: number;
    stops: number;
    pending: number;
  };
}

export interface SnapshotDetail {
  id: string;
  weekStartDate: string;
  snapshotDate: string;
  kind: "daily" | "weekly";
  generatedAt: string;
  expiresAt: string;
  aiProvider: string;
  aiModel: string;
  marketCondition: string;
  top3Summary: string;
  allocationAdvice: string;
  picks: TrackedPick[];
}

export interface PickDetail {
  pick: TrackedPick;
  snapshot: {
    generatedAt: string;
    expiresAt: string;
    aiProvider: string;
    aiModel: string;
  };
  priceHistory: Array<{ timestamp: string; price: number }>;
}

export interface ModelStats {
  sampleSize: number;
  closedSize: number;
  t1Rate: number;
  t2Rate: number;
  stopRate: number;
  pendingRate: number;
  avgReturn: number | null;
}

export interface TrackerStats {
  overall: ModelStats;
  closedSize: number;
  byModel: Record<string, ModelStats & { aiModel: string }>;
}

export function useSnapshotList(aiProvider?: string, kind?: "daily" | "weekly") {
  const params = new URLSearchParams();
  if (aiProvider) params.set("aiProvider", aiProvider);
  if (kind) params.set("kind", kind);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery<SnapshotSummary[]>({
    queryKey: ["tracker", "snapshots", aiProvider ?? "all", kind ?? "all"],
    queryFn: () =>
      apiClient.get<SnapshotSummary[]>(`/api/recommendations-tracker/snapshots${qs}`),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useSnapshotByDate(date: string | null) {
  const { lang } = useLanguage();
  return useQuery<SnapshotDetail>({
    queryKey: ["tracker", "snapshot-by-date", date, lang],
    queryFn: () =>
      apiClient.get<SnapshotDetail>(
        `/api/recommendations-tracker/snapshots/by-date?date=${encodeURIComponent(date ?? "")}&lang=${lang}`,
      ),
    enabled: !!date,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function usePickDetail(pickId: string | null) {
  const { lang } = useLanguage();
  return useQuery<PickDetail>({
    queryKey: ["tracker", "pick-detail", pickId, lang],
    queryFn: () =>
      apiClient.get<PickDetail>(`/api/recommendations-tracker/picks/${pickId}?lang=${lang}`),
    enabled: !!pickId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useTrackerStats() {
  return useQuery<TrackerStats>({
    queryKey: ["tracker", "stats"],
    queryFn: () => apiClient.get<TrackerStats>(`/api/recommendations-tracker/stats`),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
