/**
 * Maps the raw error strings returned from the AI providers into clean,
 * human-readable messages with a category icon hint. Backend just forwards the
 * upstream error verbatim (good for debugging in logs); the UI uses this helper
 * to render something a user can act on.
 */

export type ProviderErrorKind =
  | "rate-limit"
  | "quota"
  | "timeout"
  | "empty"
  | "auth"
  | "model-unavailable"
  | "network"
  | "generic";

export interface ParsedProviderError {
  kind: ProviderErrorKind;
  /** Short user-friendly message (≤ ~80 chars). */
  message: string;
  /** Optional follow-up hint (rendered as smaller text). */
  hint?: string;
}

const RATE_LIMIT_RE = /\b(429|rate[- ]?limit(ed)?|too many requests)\b/i;
const QUOTA_RE = /(quota|exceeded your)/i;
const TIMEOUT_RE = /\b(timed? ?out|timeout)\b/i;
const EMPTY_RE = /(empty response|no response)/i;
const AUTH_RE = /\b(401|403|unauthor|forbidden|invalid api key)\b/i;
const MODEL_UNAVAIL_RE = /(no endpoints found|model not found|404)/i;
const NETWORK_RE = /(econn|enotfound|fetch failed|network)/i;

/**
 * OpenRouter wraps upstream errors in a JSON structure like:
 *   {"error":{"message":"...","code":429,"metadata":{"raw":"… helpful message …"}}}
 * Try to extract the most useful nested string before pattern-matching.
 */
function extractInnerMessage(raw: string): string {
  // Skip the leading "Provider 429: " prefix our backend prepends
  const stripped = raw.replace(/^[A-Za-z-]+\s+\d{3}:\s*/, "");
  // Try to JSON-parse anything that looks like a JSON object
  const jsonStart = stripped.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(stripped.slice(jsonStart));
      const inner =
        parsed?.error?.metadata?.raw ??
        parsed?.error?.message ??
        parsed?.message;
      if (typeof inner === "string" && inner.length > 0) return inner;
    } catch {
      /* fall through */
    }
  }
  return stripped;
}

export function parseProviderError(raw: string | null | undefined): ParsedProviderError {
  if (!raw) return { kind: "generic", message: "Failed" };
  const inner = extractInnerMessage(raw);

  if (TIMEOUT_RE.test(inner) || TIMEOUT_RE.test(raw)) {
    return {
      kind: "timeout",
      message: "Took too long to respond",
      hint: "Slow upstream — usually fine on the next run",
    };
  }
  if (QUOTA_RE.test(inner) || QUOTA_RE.test(raw)) {
    return {
      kind: "quota",
      message: "Daily quota exhausted",
      hint: "Resets at midnight provider-time",
    };
  }
  if (RATE_LIMIT_RE.test(inner) || RATE_LIMIT_RE.test(raw)) {
    return {
      kind: "rate-limit",
      message: "Rate-limited upstream",
      hint: "Try again in a few minutes",
    };
  }
  if (EMPTY_RE.test(inner) || EMPTY_RE.test(raw)) {
    return {
      kind: "empty",
      message: "Returned an empty response",
      hint: "Free model glitch — usually transient",
    };
  }
  if (AUTH_RE.test(inner) || AUTH_RE.test(raw)) {
    return {
      kind: "auth",
      message: "Authentication failed",
      hint: "Check the API key configuration",
    };
  }
  if (MODEL_UNAVAIL_RE.test(inner) || MODEL_UNAVAIL_RE.test(raw)) {
    return {
      kind: "model-unavailable",
      message: "Model not available",
      hint: "Free endpoint may have been retired",
    };
  }
  if (NETWORK_RE.test(inner) || NETWORK_RE.test(raw)) {
    return {
      kind: "network",
      message: "Network error",
      hint: "Couldn't reach the provider",
    };
  }
  // Generic fallback — show first ~80 chars of the inner message
  return {
    kind: "generic",
    message: inner.slice(0, 90).trim() + (inner.length > 90 ? "…" : ""),
  };
}
