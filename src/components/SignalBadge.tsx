"use client";

const SIGNAL_STYLES: Record<string, string> = {
  "Strong Buy": "bg-emerald-900 text-emerald-300",
  Buy: "bg-green-900 text-green-300",
  Neutral: "bg-gray-800 text-gray-400",
  Sell: "bg-amber-900 text-amber-400",
  "Strong Sell": "bg-amber-950 text-amber-500",
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
  if (!signal) return <span className="text-gray-700">—</span>;

  const cls = SIGNAL_STYLES[signal] ?? "bg-gray-800 text-gray-400";
  const sizeClass = size === "md" ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-xs";
  const hasTooltip = reasons?.length || summary;

  return (
    <div className="relative group/signal inline-block">
      <span
        className={`${sizeClass} rounded font-medium whitespace-nowrap ${cls} ${hasTooltip ? "cursor-help" : ""} inline-flex items-center gap-1`}
      >
        {signal}
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
