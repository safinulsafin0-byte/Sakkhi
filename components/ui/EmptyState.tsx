import { type FC, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  title = "No verification records yet",
  description = "When evidence files or receipts are submitted, they will appear here with cryptographic proofs and witness timestamps.",
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-soft bg-paper-card/70 p-8 text-center max-w-lg mx-auto my-6",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-soft text-terracotta" aria-hidden="true">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </div>

      <h3 className="font-serif text-xl font-semibold text-ink tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-base text-ink-muted leading-relaxed max-w-md">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
