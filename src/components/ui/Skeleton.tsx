"use client";

interface SkeletonProps {
  className?: string;
  /** Width as CSS value, e.g. "100%", "120px" */
  width?: string;
  /** Height as CSS value, e.g. "16px", "2rem" */
  height?: string;
  /** Render a circle (avatar placeholder) */
  circle?: boolean;
}

export default function Skeleton({
  className = "",
  width,
  height,
  circle,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${circle ? "rounded-full" : "rounded-lg"} ${className}`}
      style={{
        width: circle ? height : width,
        height,
        minHeight: height ?? "16px",
      }}
      aria-hidden="true"
    />
  );
}

/** Pre-built skeleton for a card with title + 3 lines */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-surface rounded-xl border border-border p-4 sm:p-5 space-y-3 ${className}`}>
      <Skeleton width="40%" height="20px" />
      <Skeleton width="100%" height="14px" />
      <Skeleton width="80%" height="14px" />
      <Skeleton width="60%" height="14px" />
    </div>
  );
}

/** Pre-built skeleton for a table row */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <Skeleton width={i === 0 ? "80px" : "60px"} height="14px" />
        </td>
      ))}
    </tr>
  );
}
