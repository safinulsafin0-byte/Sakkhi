import { type HTMLAttributes, type FC } from "react";
import { cn } from "@/lib/utils";

export interface VerifiedBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
  size?: "sm" | "md";
}

export const VerifiedBadge: FC<VerifiedBadgeProps> = ({
  className,
  label = "Verified Witness",
  size = "md",
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest-soft text-forest font-medium select-none shadow-sm",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
      {...props}
    >
      <svg
        className={cn(size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4", "flex-shrink-0 text-forest")}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.4" />
        <path
          d="M5.5 10.5 C 6.8 11.8, 7.8 13.5, 8.8 14.5 C 10.5 11.2, 12.8 7.8, 15 5.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label}</span>
    </span>
  );
};
