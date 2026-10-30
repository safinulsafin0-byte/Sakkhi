import { type FC } from "react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  current: number;
  target: number;
  currency?: string;
  className?: string;
  label?: string;
  showPercentage?: boolean;
}

export const ProgressBar: FC<ProgressBarProps> = ({
  current,
  target,
  currency = "BDT",
  className,
  label,
  showPercentage = true,
}) => {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const formattedCurrent = current.toLocaleString();
  const formattedTarget = target.toLocaleString();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        {label && <span className="font-medium text-ink">{label}</span>}
        <span className="text-ink font-medium">
          <strong className="text-terracotta font-semibold">{formattedCurrent}</strong> of{" "}
          <span>{formattedTarget} {currency}</span>
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
        className="h-3.5 w-full overflow-hidden rounded-full bg-paper-dark border border-border-soft p-0.5"
      >
        <div
          className="h-full rounded-full bg-terracotta transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showPercentage && (
        <div className="flex justify-between items-center text-xs text-ink-muted">
          <span>{percentage}% of witnessed goal reached</span>
          <span>{Math.max(0, target - current).toLocaleString()} {currency} remaining</span>
        </div>
      )}
    </div>
  );
};
