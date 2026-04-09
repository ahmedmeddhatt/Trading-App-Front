"use client";

type StockStatus = "Hot" | "Warming Up" | "Neutral" | "Cooling Down" | "Cold";

/** Map external recommendation values to our Hot/Cold status */
function toStockStatus(signal?: string | null): StockStatus | null {
  if (!signal) return null;
  const s = signal.trim();
  // Already a valid status
  const valid: StockStatus[] = ["Hot", "Warming Up", "Neutral", "Cooling Down", "Cold"];
  const match = valid.find((v) => v.toLowerCase() === s.toLowerCase());
  if (match) return match;
  // Map recommendation → status
  const map: Record<string, StockStatus> = {
    "strong buy": "Hot",
    buy: "Warming Up",
    hold: "Neutral",
    neutral: "Neutral",
    sell: "Cooling Down",
    "strong sell": "Cold",
  };
  return map[s.toLowerCase()] ?? null;
}

const STATUS_STYLES: Record<StockStatus, string> = {
  Hot: "bg-red-900/60 text-red-300",
  "Warming Up": "bg-amber-900/60 text-amber-300",
  Neutral: "bg-gray-800 text-gray-400",
  "Cooling Down": "bg-blue-900/60 text-blue-300",
  Cold: "bg-cyan-900/60 text-cyan-300",
};

const STATUS_ICONS: Record<StockStatus, string> = {
  Hot: "🔥",
  "Warming Up": "🌡️",
  Neutral: "➖",
  "Cooling Down": "❄️",
  Cold: "🧊",
};

interface SignalBadgeProps {
  signal?: string | null;
  reasons?: string[];
  summary?: string;
  confidence?: string;
  size?: "sm" | "md";
}

export default function SignalBadge({
  signal,
  reasons,
  summary,
  confidence,
  size = "sm",
}: SignalBadgeProps) {
  const status = toStockStatus(signal);
  if (!status) return <span className="text-gray-700">—</span>;

  const cls = STATUS_STYLES[status];
  const icon = STATUS_ICONS[status];
  const sizeClass = size === "md" ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-xs";
  const hasTooltip = reasons?.length || summary;

  return (
    <div className="relative group/signal inline-block">
      <span
        className={`${sizeClass} rounded font-medium whitespace-nowrap ${cls} ${hasTooltip ? "cursor-help" : ""} inline-flex items-center gap-1`}
      >
        <span>{icon}</span>
        {status}
        {confidence && (
          <span className="opacity-60 text-[10px]">({confidence})</span>
        )}
      </span>

      {hasTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-xs text-gray-300 invisible group-hover/signal:visible opacity-0 group-hover/signal:opacity-100 transition-opacity duration-200 pointer-events-none">
          {summary && (
            <p className="font-semibold text-white mb-1.5 leading-snug">
              {summary}
            </p>
          )}
          {reasons && reasons.length > 0 && (
            <>
              <p className="text-gray-500 uppercase text-[10px] tracking-wider mb-1">
                Why this signal
              </p>
              <ul className="space-y-0.5">
                {reasons.map((r, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-gray-500 shrink-0">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-gray-900 border-b border-r border-gray-700 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
