import { type FC } from "react";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "./VerifiedBadge";

export interface ReceiptItem {
  label: string;
  value: string;
}

export interface ReceiptCardProps {
  receiptCode?: string;
  issuedAt?: string;
  amount?: string;
  currency?: string;
  purpose?: string;
  donorOrBeneficiary?: string;
  witnessHash?: string;
  items?: ReceiptItem[];
  className?: string;
  isVerified?: boolean;
}

export const ReceiptCard: FC<ReceiptCardProps> = ({
  receiptCode = "SKH-2026-0042",
  issuedAt = "29 Oct 2026",
  amount = "5,000",
  currency = "BDT",
  purpose = "Flood Relief Water Purification Kits",
  donorOrBeneficiary = "Sylhet Community Kitchen",
  witnessHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  items = [],
  className,
  isVerified = true,
}) => {
  return (
    <div className="w-full flex justify-center overflow-hidden py-3 px-1">
      <div
        className={cn(
          "relative w-full max-w-[310px] sm:max-w-md bg-paper-card text-ink rounded-lg border border-border-soft p-5 sm:p-6 shadow-receipt transform rotate-[-1deg] hover:rotate-0 transition-transform duration-300 font-sans",
          className
        )}
      >
        <div className="text-center pb-3 border-b border-border-soft">
          <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-ink">
            SAKKHI RECEIPT
          </div>
          <p className="text-[11px] sm:text-xs uppercase tracking-widest text-ink-muted mt-0.5">
            Witnessed & Recorded on Public Ledger
          </p>
        </div>

        <div className="py-3.5 space-y-2 text-sm">
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-ink-muted flex-shrink-0">Receipt Ref:</span>
            <span className="font-mono font-medium text-ink truncate">{receiptCode}</span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-ink-muted flex-shrink-0">Date:</span>
            <span className="text-ink truncate">{issuedAt}</span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-ink-muted flex-shrink-0">For:</span>
            <span className="text-ink font-medium text-right max-w-[170px] sm:max-w-[210px] truncate">{purpose}</span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-ink-muted flex-shrink-0">Party:</span>
            <span className="text-ink text-right max-w-[170px] sm:max-w-[210px] truncate">{donorOrBeneficiary}</span>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-baseline gap-2">
              <span className="text-ink-muted flex-shrink-0">{item.label}:</span>
              <span className="text-ink text-right truncate">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="relative my-3 -mx-5 sm:-mx-6">
          <div className="border-b-2 border-dashed border-border-soft" />
          <div className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-paper border border-border-soft/40" />
          <div className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-paper border border-border-soft/40" />
        </div>

        <div className="py-2 flex items-baseline justify-between">
          <span className="text-sm sm:text-base font-medium text-ink-muted">Verified Amount</span>
          <div className="text-right">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-terracotta tracking-tight">
              {amount}
            </span>
            <span className="ml-1 text-xs sm:text-sm font-semibold text-ink-muted">{currency}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-border-soft flex items-center justify-between gap-2">
          <div className="space-y-0.5 overflow-hidden">
            <p className="text-[10px] uppercase tracking-wider text-ink-faint">
              SHA-256 Proof
            </p>
            <p className="font-mono text-[10px] sm:text-[11px] text-ink-muted max-w-[150px] sm:max-w-[210px] truncate">
              {witnessHash}
            </p>
          </div>
          <div className="flex-shrink-0">
            {isVerified && <VerifiedBadge size="sm" label="Witnessed" />}
          </div>
        </div>
      </div>
    </div>
  );
};
