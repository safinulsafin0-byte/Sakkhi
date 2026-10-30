"use client";

import { useState, type ChangeEvent, type FC } from "react";
import { cn } from "@/lib/utils";

export type Currency = "BDT" | "USD";

export interface AmountInputProps {
  value?: number;
  onChange?: (value: number, currency: Currency) => void;
  defaultCurrency?: Currency;
  min?: number;
  max?: number;
  className?: string;
  label?: string;
}

export const AmountInput: FC<AmountInputProps> = ({
  value: controlledValue,
  onChange,
  defaultCurrency = "BDT",
  min = 0,
  max,
  className,
  label = "Verification or Contribution Amount",
}) => {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [internalValue, setInternalValue] = useState<string>(
    controlledValue !== undefined ? controlledValue.toString() : "1000"
  );

  const activeValue = controlledValue !== undefined ? controlledValue.toString() : internalValue;

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    const num = parseFloat(activeValue) || 0;
    onChange?.(num, newCurrency);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    setInternalValue(raw);
    const num = parseFloat(raw) || 0;
    onChange?.(num, currency);
  };

  const currencySymbol = currency === "BDT" ? "৳" : "$";

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-ink-muted">
          {label}
        </label>
      )}

      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center rounded-xl border-2 border-border-soft bg-paper-card focus-within:border-terracotta transition-colors shadow-sm overflow-hidden">
        {/* Currency Toggle Buttons (44px min target) */}
        <div className="flex bg-paper-dark/60 p-1 border-b sm:border-b-0 sm:border-r border-border-soft">
          <button
            type="button"
            onClick={() => handleCurrencyChange("BDT")}
            className={cn(
              "flex-1 sm:flex-initial px-4 py-2 min-h-[44px] min-w-[44px] text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta cursor-pointer",
              currency === "BDT"
                ? "bg-paper-card text-terracotta font-semibold shadow-sm"
                : "text-ink-muted hover:text-ink"
            )}
          >
            BDT (৳)
          </button>
          <button
            type="button"
            onClick={() => handleCurrencyChange("USD")}
            className={cn(
              "flex-1 sm:flex-initial px-4 py-2 min-h-[44px] min-w-[44px] text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta cursor-pointer",
              currency === "USD"
                ? "bg-paper-card text-terracotta font-semibold shadow-sm"
                : "text-ink-muted hover:text-ink"
            )}
          >
            USD ($)
          </button>
        </div>

        {/* Input Field with Big Digits */}
        <div className="flex items-center flex-1 px-4 py-3">
          <span className="text-2xl sm:text-3xl font-serif text-ink-muted mr-2 select-none">
            {currencySymbol}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={activeValue}
            onChange={handleInputChange}
            placeholder="0"
            className="w-full bg-transparent text-2xl sm:text-3xl font-serif font-semibold text-ink focus:outline-none tracking-tight placeholder:text-ink-faint min-h-[44px]"
            aria-label={`${currency} amount`}
          />
        </div>
      </div>
      <p className="text-xs text-ink-faint">
        {currency === "BDT"
          ? "Expressed in Bangladeshi Taka"
          : "Expressed in US Dollars (PayPal Sandbox conversion)"}
      </p>
    </div>
  );
};
