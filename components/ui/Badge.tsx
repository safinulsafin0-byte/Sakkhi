import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "neutral" | "terracotta" | "forest" | "amber";
  children: ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variants = {
      default: "bg-paper-dark text-ink-muted border-border-soft",
      neutral: "bg-paper-dark text-ink-muted border-border-soft",
      terracotta: "bg-terracotta-soft text-terracotta border-terracotta/20",
      forest: "bg-forest-soft text-forest border-forest/20",
      amber: "bg-amber-soft text-amber border-amber/20",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium tracking-wide",
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
