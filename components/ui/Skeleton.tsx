import { type HTMLAttributes, type FC } from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export const Skeleton: FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-paper-dark border border-border-soft/60",
        className
      )}
      {...props}
    />
  );
};
