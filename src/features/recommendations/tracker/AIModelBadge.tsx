"use client";

/**
 * Per-AI provider badge — a colored letter avatar followed by the provider
 * name and (optionally) the model identifier. Colors are picked per family so
 * the user can scan a card grid and instantly see which AI made which pick.
 */

interface ProviderStyle {
  /** Tailwind class for the letter avatar background */
  avatarBg: string;
  /** Avatar letter color */
  avatarText: string;
  /** Outer chip background */
  chipBg: string;
  /** Outer chip text */
  chipText: string;
  /** Outer chip border */
  chipBorder: string;
  /** Single-letter monogram used inside the avatar */
  letter: string;
}

const PROVIDER_STYLES: Record<string, ProviderStyle> = {
  // Google Gemini — emerald
  Gemini: {
    avatarBg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    avatarText: "text-white",
    chipBg: "bg-emerald-50 dark:bg-emerald-950/40",
    chipText: "text-emerald-700 dark:text-emerald-300",
    chipBorder: "border-emerald-200 dark:border-emerald-800/60",
    letter: "G",
  },
  // Groq (Llama 3.3 70B) — amber
  Groq: {
    avatarBg: "bg-gradient-to-br from-amber-400 to-amber-600",
    avatarText: "text-white",
    chipBg: "bg-amber-50 dark:bg-amber-950/40",
    chipText: "text-amber-700 dark:text-amber-300",
    chipBorder: "border-amber-200 dark:border-amber-800/60",
    letter: "Q",
  },
  // OpenRouter (Nemotron 120B) — blue
  OpenRouter: {
    avatarBg: "bg-gradient-to-br from-blue-400 to-blue-600",
    avatarText: "text-white",
    chipBg: "bg-blue-50 dark:bg-blue-950/40",
    chipText: "text-blue-700 dark:text-blue-300",
    chipBorder: "border-blue-200 dark:border-blue-800/60",
    letter: "O",
  },
  // Meta Llama 3.2 3B — purple
  Llama: {
    avatarBg: "bg-gradient-to-br from-purple-400 to-purple-600",
    avatarText: "text-white",
    chipBg: "bg-purple-50 dark:bg-purple-950/40",
    chipText: "text-purple-700 dark:text-purple-300",
    chipBorder: "border-purple-200 dark:border-purple-800/60",
    letter: "L",
  },
  // Google Gemma 3 27B — yellow
  Gemma: {
    avatarBg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
    avatarText: "text-white",
    chipBg: "bg-yellow-50 dark:bg-yellow-950/40",
    chipText: "text-yellow-700 dark:text-yellow-300",
    chipBorder: "border-yellow-200 dark:border-yellow-800/60",
    letter: "M",
  },
  // Nous Hermes 3 (Llama 3.1 405B) — pink
  Hermes: {
    avatarBg: "bg-gradient-to-br from-pink-400 to-pink-600",
    avatarText: "text-white",
    chipBg: "bg-pink-50 dark:bg-pink-950/40",
    chipText: "text-pink-700 dark:text-pink-300",
    chipBorder: "border-pink-200 dark:border-pink-800/60",
    letter: "H",
  },
  // Alibaba Qwen3 — cyan
  Qwen: {
    avatarBg: "bg-gradient-to-br from-cyan-400 to-cyan-600",
    avatarText: "text-white",
    chipBg: "bg-cyan-50 dark:bg-cyan-950/40",
    chipText: "text-cyan-700 dark:text-cyan-300",
    chipBorder: "border-cyan-200 dark:border-cyan-800/60",
    letter: "W",
  },
  // OpenAI GPT-OSS 120B — slate
  "GPT-OSS": {
    avatarBg: "bg-gradient-to-br from-slate-500 to-slate-700",
    avatarText: "text-white",
    chipBg: "bg-slate-100 dark:bg-slate-800/60",
    chipText: "text-slate-700 dark:text-slate-200",
    chipBorder: "border-slate-300 dark:border-slate-700",
    letter: "X",
  },
  // Zhipu GLM 4.5 Air — fuchsia
  GLM: {
    avatarBg: "bg-gradient-to-br from-fuchsia-400 to-fuchsia-600",
    avatarText: "text-white",
    chipBg: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    chipText: "text-fuchsia-700 dark:text-fuchsia-300",
    chipBorder: "border-fuchsia-200 dark:border-fuchsia-800/60",
    letter: "Z",
  },
};

const FALLBACK: ProviderStyle = {
  avatarBg: "bg-gradient-to-br from-gray-400 to-gray-600",
  avatarText: "text-white",
  chipBg: "bg-gray-100 dark:bg-gray-800",
  chipText: "text-gray-700 dark:text-gray-200",
  chipBorder: "border-gray-200 dark:border-gray-700",
  letter: "?",
};

export function getProviderLetter(provider: string): string {
  return PROVIDER_STYLES[provider]?.letter ?? FALLBACK.letter;
}

export function getProviderColors(provider: string): ProviderStyle {
  return PROVIDER_STYLES[provider] ?? FALLBACK;
}

/**
 * Avatar-only variant — a single colored letter circle. Useful in tight
 * spaces (e.g. inside a pick card header) where the chip would crowd.
 */
export function AIModelAvatar({
  provider,
  size = "md",
}: {
  provider: string;
  size?: "xs" | "sm" | "md";
}) {
  const style = getProviderColors(provider);
  const sizeClass =
    size === "xs"
      ? "w-4 h-4 text-[8px]"
      : size === "sm"
        ? "w-5 h-5 text-[10px]"
        : "w-6 h-6 text-[11px]";
  return (
    <span
      title={provider}
      className={`inline-flex items-center justify-center rounded-full font-bold shadow-sm ${style.avatarBg} ${style.avatarText} ${sizeClass}`}
    >
      {style.letter}
    </span>
  );
}

/**
 * Full chip — letter avatar + provider name (+ optional model name in md size).
 * Use this in the rec page header, footnotes, and grouped row headers.
 */
export function AIModelBadge({
  provider,
  model,
  size = "md",
}: {
  provider: string;
  model?: string;
  size?: "sm" | "md";
}) {
  const style = getProviderColors(provider);
  const padding =
    size === "sm" ? "pr-2 py-0.5 text-[10px]" : "pr-2.5 py-1 text-xs";
  const avatarSize = size === "sm" ? "w-4 h-4 text-[8px] ml-0.5" : "w-5 h-5 text-[10px] ml-1";
  return (
    <span
      title={model ? `${provider} · ${model}` : provider}
      className={`inline-flex items-center gap-1.5 rounded-full border ${style.chipBg} ${style.chipText} ${style.chipBorder} ${padding} font-bold leading-none whitespace-nowrap`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full font-bold shadow-sm ${style.avatarBg} ${style.avatarText} ${avatarSize}`}
      >
        {style.letter}
      </span>
      {provider}
      {model && size === "md" ? (
        <span className="opacity-60 font-medium tracking-tight">· {model}</span>
      ) : null}
    </span>
  );
}
