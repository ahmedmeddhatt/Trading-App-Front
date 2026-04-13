"use client";

import { forwardRef } from "react";

type CardVariant = "default" | "elevated" | "interactive";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** When true, uses the page-level surface color instead of elevated */
  flat?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    "bg-surface rounded-xl border border-border p-4 sm:p-5",
  elevated:
    "bg-surface-elevated rounded-xl border border-border p-4 sm:p-5 shadow-sm",
  interactive:
    "bg-surface-elevated rounded-xl border border-border p-4 sm:p-5 td-hover-card",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", flat, className = "", children, style, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={`${variantClasses[variant]} animate-card-enter ${className}`}
        style={style}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
export default Card;
