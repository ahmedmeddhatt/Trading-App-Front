"use client";

import { DateRange } from "@/lib/rangeToFromTo";

interface RangeSelectorProps {
  range: string;
  onChange: (range: DateRange) => void;
  ranges?: readonly string[];
}

const DEFAULT_RANGES: readonly string[] = ["1W", "1M", "3M", "6M", "1Y"];

export default function RangeSelector({ range, onChange, ranges = DEFAULT_RANGES }: RangeSelectorProps) {
  return (
    <div className="flex gap-1">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r as DateRange)}
          className={`px-2.5 py-1 rounded text-xs font-medium active:scale-95 transition-all duration-150 ${
            range === r ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-white hover:bg-gray-800"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
