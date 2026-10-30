import { type FC } from "react";
import { cn } from "@/lib/utils";

export interface HandUnderlineProps {
  className?: string;
  color?: string;
}

export const HandUnderline: FC<HandUnderlineProps> = ({
  className,
  color = "currentColor",
}) => {
  return (
    <svg
      className={cn("w-full h-3 max-w-[220px] text-terracotta -mt-1 select-none", className)}
      viewBox="0 0 200 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 8.2 C 45 3.1, 95 10.4, 197.5 4.5"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path
        d="M12 9.5 C 50 6.2, 110 11.2, 185 6.8"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  );
};
