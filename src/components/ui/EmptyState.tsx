"use client";

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 sm:py-16 text-center animate-fade-in ${className}`}>
      <div className="rounded-2xl bg-surface-hover p-4 mb-4">
        <Icon size={32} className="text-t-muted" strokeWidth={1.5} />
      </div>
      <h3 className="text-subheading text-t-primary mb-1">{title}</h3>
      {description && (
        <p className="text-body text-t-tertiary max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
