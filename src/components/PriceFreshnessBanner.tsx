"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { PriceData } from "@/hooks/usePriceStream";

interface Props {
  prices: Record<string, PriceData>;
  symbols: string[];
  /** Seconds after which a price is considered stale. Default: 60 */
  threshold?: number;
}

export default function PriceFreshnessBanner({
  prices,
  symbols,
  threshold = 60,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Tick every 10 s to re-evaluate staleness
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  // Re-show banner if stale count changes after dismissal
  const staleSymbols = symbols.filter((s) => {
    const p = prices[s];
    if (!p) return false; // never received — not stale, just loading
    const ts = typeof p.timestamp === "string" ? Date.parse(p.timestamp) : p.timestamp;
    return now - ts > threshold * 1000;
  });

  useEffect(() => {
    if (staleSymbols.length > 0) setDismissed(false);
  }, [staleSymbols.length]);

  if (staleSymbols.length === 0 || dismissed) return null;

  return (
    <div className="bg-amber-900/40 border-b border-amber-800/60 px-6 py-2 flex items-center justify-between text-amber-300 text-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="shrink-0" />
        <span>
          <strong>{staleSymbols.length}</strong> price
          {staleSymbols.length !== 1 ? "s" : ""} may be stale (
          {staleSymbols.slice(0, 5).join(", ")}
          {staleSymbols.length > 5 ? ` +${staleSymbols.length - 5} more` : ""}
          ). Reconnecting…
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-200 ml-4 shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
