"use client";

import { useMarketStatus } from "@/hooks/useMarketStatus";
import { formatCountdown } from "@/lib/marketHours";

export default function MarketStatusBar() {
  const status = useMarketStatus();

  let bg: string;
  let dot: string;
  let text: string;

  switch (status.label) {
    case "Open":
      bg = "bg-emerald-950 border-emerald-800";
      dot = "bg-emerald-400";
      text = `Market Open — closes in ${formatCountdown(status.closesInMs)}`;
      break;
    case "Pre-Market":
      bg = "bg-amber-950 border-amber-800";
      dot = "bg-amber-400";
      text = `Pre-Market — opens in ${formatCountdown(status.nextOpenMs)}`;
      break;
    case "Weekend": {
      bg = "bg-gray-900 border-gray-800";
      dot = "bg-gray-500";
      text = `Weekend — market reopens Sunday at 10:00 AM`;
      break;
    }
    default: {
      // Closed / Post-Market
      const opensIn = formatCountdown(status.nextOpenMs);
      bg = "bg-gray-900 border-gray-800";
      dot = "bg-gray-500";
      text = `Market Closed — opens in ${opensIn}`;
    }
  }

  return (
    <div className={`w-full border-b ${bg} px-6 py-2 flex items-center gap-2`}>
      <span className={`inline-block w-2 h-2 rounded-full ${dot} shrink-0`} />
      <span className="text-xs text-gray-300 font-medium">{text}</span>
    </div>
  );
}
