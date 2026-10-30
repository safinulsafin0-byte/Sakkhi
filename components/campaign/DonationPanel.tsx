"use client";

import React, { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AmountInput, type Currency } from "@/components/ui/AmountInput";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { CURRENCY_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";

interface DonationPanelProps {
  campaignId: string;
  campaignTitle: string;
  paypalClientId?: string;
  isLivePaypal?: boolean;
  isMockAi?: boolean;
  className?: string;
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000];

interface SuccessState {
  donorName: string;
  amountBdt: number;
  amountUsd: string;
  receiptCode: string;
  paypalOrderId: string;
}

export const DonationPanel: React.FC<DonationPanelProps> = ({
  campaignId,
  campaignTitle,
  paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
  isLivePaypal = false,
  isMockAi = true,
  className,
}) => {
  const [amount, setAmount] = useState<number>(500);
  const [currency, setCurrency] = useState<Currency>("BDT");
  const [donorName, setDonorName] = useState<string>("");
  const [donorEmail, setDonorEmail] = useState<string>("");
  const [giveAnonymously, setGiveAnonymously] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessState | null>(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);

  const isPayPalSimulated =
    !isLivePaypal &&
    (!paypalClientId ||
      paypalClientId === "" ||
      paypalClientId === "test" ||
      process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID === undefined ||
      process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID === "");

  // Compute conversions
  const bdtEquivalent =
    currency === "BDT" ? amount : Math.round(amount * CURRENCY_CONFIG.USD_TO_BDT_RATE);
  const usdEquivalent =
    currency === "USD"
      ? amount.toFixed(2)
      : (amount / CURRENCY_CONFIG.USD_TO_BDT_RATE).toFixed(2);

  const handlePresetSelect = (preset: number) => {
    setAmount(preset);
    setCurrency("BDT");
    setErrorMessage(null);
  };

  const handleCreateOrder = async (): Promise<string> => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/donations/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          amount,
          currency,
          donorName: donorName.trim() || undefined,
          donorEmail: donorEmail.trim() || undefined,
          message: message.trim() || undefined,
          giveAnonymously,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate PayPal order");
      }

      return data.orderId;
    } catch (err: any) {
      setErrorMessage(
        err.message || "We could not reach PayPal Sandbox to create the payment order. Please try again."
      );
      setIsProcessing(false);
      throw err;
    }
  };

  const handleApproveOrder = async (data: { orderID: string }) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/donations/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID }),
      });

      const captureData = await res.json();

      if (!res.ok) {
        throw new Error(captureData.error || "Payment capture verification failed");
      }

      setSuccessData({
        donorName: captureData.donorName || (giveAnonymously ? "Anonymous Neighbor" : "Kind Neighbor"),
        amountBdt: captureData.amountBdt,
        amountUsd: captureData.amountUsd,
        receiptCode: captureData.receiptCode,
        paypalOrderId: data.orderID,
      });
      setIsProcessing(false);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          "Payment was approved by PayPal but verification failed on our server. Your funds are protected."
      );
      setIsProcessing(false);
    }
  };

  const effectiveClientId = paypalClientId || "test";

  return (
    <>
      {/* Desktop / In-Flow Card */}
      <Card
        className={cn(
          "p-6 sm:p-8 space-y-6 bg-paper-card border-border-soft shadow-sm",
          className
        )}
      >
        {/* Success State */}
        {successData ? (
          <div className="space-y-4 text-center py-4 animate-in fade-in duration-300">
            <div className="w-14 h-14 bg-forest-soft text-forest rounded-full mx-auto flex items-center justify-center text-2xl">
              ✓
            </div>
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-forest font-bold">
                Witnessed &amp; Escrowed
              </span>
              <h3 className="font-serif text-2xl font-bold text-ink">
                Thank you, {successData.donorName}.
              </h3>
              <p className="text-base text-ink-muted leading-relaxed">
                Your <strong className="text-terracotta">{successData.amountBdt} BDT</strong> (~${successData.amountUsd} USD) is now waiting for the next milestone.
              </p>
            </div>

            <div className="bg-paper p-4 rounded-xl border border-border-soft text-left text-xs font-mono space-y-1.5 text-ink-muted">
              <div>
                Receipt Code: <strong className="text-ink">{successData.receiptCode}</strong>
              </div>
              <div>
                PayPal Ref: <span className="text-ink">{successData.paypalOrderId}</span>
              </div>
              <div>
                Status: <span className="text-forest font-bold">LOCKED IN MILESTONE ESCROW</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setSuccessData(null);
                setAmount(500);
              }}
              className="w-full"
            >
              Support Another Milestone
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase tracking-widest text-terracotta font-semibold">
                  Transparent Community Giving
                </span>
                <VerifiedBadge label="Escrow Protected" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-ink">
                Witnessed Contribution
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Funds remain locked in milestone escrow and disburse only when supplier receipts and GPS photos pass forensic inspection.
              </p>
            </div>

            {/* Demo mode status badges */}
            {(isPayPalSimulated || isMockAi) && (
              <div className="space-y-1.5 pt-1">
                {isPayPalSimulated && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                    Demo mode: PayPal calls are simulated
                  </div>
                )}
                {isMockAi && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-800 text-xs font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    Demo mode: AI results are simulated
                  </div>
                )}
              </div>
            )}

            {/* Quick Amount Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
                Select Amount (BDT)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((preset) => {
                  const isSelected = currency === "BDT" && amount === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={cn(
                        "min-h-[44px] min-w-[44px] py-2 px-1 text-sm font-semibold rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta",
                        isSelected
                          ? "border-terracotta bg-terracotta text-white shadow-sm"
                          : "border-border-soft bg-paper hover:bg-paper-dark text-ink"
                      )}
                    >
                      ৳{preset.toLocaleString()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="space-y-2">
              <AmountInput
                value={amount}
                defaultCurrency={currency}
                onChange={(val, curr) => {
                  setAmount(val);
                  setCurrency(curr);
                  setErrorMessage(null);
                }}
                label="Or Enter Custom Amount"
              />
              <p className="text-xs text-ink-muted flex items-center justify-between pt-1">
                <span>
                  {currency === "BDT" ? (
                    <>
                      ≈ <strong className="text-ink">${usdEquivalent} USD</strong> (PayPal Sandbox at 1 USD = 120 BDT)
                    </>
                  ) : (
                    <>
                      ≈ <strong className="text-ink">৳{bdtEquivalent.toLocaleString()} BDT</strong>
                    </>
                  )}
                </span>
                <span className="font-mono text-[11px] text-forest font-medium">Zero platform cut</span>
              </p>
            </div>

            {/* Optional Donor Information */}
            <div className="space-y-3 pt-1 border-t border-border-soft/60">
              <div className="flex items-center justify-between">
                <label htmlFor="give-anonymously" className="text-xs font-medium text-ink flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input
                    id="give-anonymously"
                    type="checkbox"
                    checked={giveAnonymously}
                    onChange={(e) => setGiveAnonymously(e.target.checked)}
                    className="w-4 h-4 rounded border-border-soft text-terracotta focus:ring-terracotta cursor-pointer"
                  />
                  <span>Give anonymously on public timeline</span>
                </label>
              </div>

              {!giveAnonymously && (
                <div>
                  <label htmlFor="donor-name" className="block text-xs font-medium text-ink-muted mb-1">
                    Your Name (Displayed on public timeline)
                  </label>
                  <input
                    id="donor-name"
                    type="text"
                    placeholder="e.g. Hasan Mahmud"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-border-soft bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-terracotta"
                  />
                </div>
              )}

              <div>
                <label htmlFor="donor-email" className="block text-xs font-medium text-ink-muted mb-1">
                  Email (Private, for verified witness receipt)
                </label>
                <input
                  id="donor-email"
                  type="email"
                  placeholder="e.g. hasan@example.com"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-border-soft bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-terracotta"
                />
              </div>
            </div>

            {/* Gentle Error State */}
            {errorMessage && (
              <div className="rounded-xl border border-terracotta/30 bg-terracotta-soft/60 p-4 space-y-1.5 text-left animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-terracotta font-semibold text-xs uppercase tracking-wider">
                  <span>⚠️</span> Payment Notice
                </div>
                <p className="text-xs text-ink leading-relaxed">
                  {errorMessage}
                </p>
                <p className="text-[11px] text-ink-muted">
                  No funds were deducted. You can retry with a different amount or payment method.
                </p>
              </div>
            )}

            {/* PayPal JS SDK Buttons */}
            <div className="pt-2">
              <PayPalScriptProvider
                options={{
                  clientId: effectiveClientId,
                  currency: "USD",
                  intent: "capture",
                }}
              >
                <div className="min-h-[48px]">
                  <PayPalButtons
                    style={{
                      layout: "vertical",
                      color: "gold",
                      shape: "rect",
                      label: "donate",
                      height: 44,
                    }}
                    disabled={isProcessing || amount <= 0}
                    createOrder={handleCreateOrder}
                    onApprove={handleApproveOrder}
                    onCancel={() => {
                      setErrorMessage("Payment was cancelled. No money moved.");
                      setIsProcessing(false);
                    }}
                    onError={(err) => {
                      setErrorMessage(
                        "We couldn't complete your PayPal contribution right now. Your card was not charged. Please check Sandbox credentials or try again."
                      );
                      setIsProcessing(false);
                    }}
                  />
                </div>
              </PayPalScriptProvider>

              {isPayPalSimulated && (
                <div className="pt-2 border-t border-border-soft/60">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="w-full font-semibold"
                    disabled={isProcessing || amount <= 0}
                    onClick={async () => {
                      setIsProcessing(true);
                      setErrorMessage(null);
                      try {
                        const orderId = await handleCreateOrder();
                        await handleApproveOrder({ orderID: orderId });
                      } catch (err: any) {
                        setErrorMessage(err.message || "Simulated payment failed");
                        setIsProcessing(false);
                      }
                    }}
                  >
                    {isProcessing ? "Processing Escrow..." : "Simulate Demo Contribution (Test Escrow)"}
                  </Button>
                  <p className="text-[11px] text-ink-muted text-center pt-1.5">
                    Demo Mode: Emulates PayPal Orders API &amp; captures funds directly into campaign escrow.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Mobile Sticky Bottom Bar (Screens < 1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-paper-card border-t border-border-soft px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-ink-muted block font-mono">
              Pledge with escrow
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-serif font-bold text-terracotta">
                ৳{bdtEquivalent.toLocaleString()}
              </span>
              <span className="text-xs text-ink-muted font-sans">BDT (~${usdEquivalent})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileExpanded(!isMobileExpanded)}
              className="text-xs text-ink-muted hover:text-terracotta underline p-2 min-h-[44px] inline-flex items-center font-medium"
            >
              {isMobileExpanded ? "Close" : "Options"}
            </button>
            <Button
              type="button"
              onClick={() => {
                setIsMobileExpanded(true);
                window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
              }}
              variant="primary"
              size="md"
              className="min-h-[44px] px-5"
            >
              Give ৳{bdtEquivalent.toLocaleString()}
            </Button>
          </div>
        </div>

        {/* Mobile Expanded Drawer */}
        {isMobileExpanded && (
          <div className="pt-3 pb-2 border-t border-border-soft/60 mt-3 space-y-3 max-w-md mx-auto">
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    "min-h-[44px] py-1 text-xs font-semibold rounded-md border",
                    amount === preset && currency === "BDT"
                      ? "border-terracotta bg-terracotta text-white"
                      : "border-border-soft bg-paper text-ink"
                  )}
                >
                  ৳{preset}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-muted text-center">
              Scroll up to the contribution card to complete payment via PayPal Sandbox.
            </p>
          </div>
        )}
      </div>
    </>
  );
};
