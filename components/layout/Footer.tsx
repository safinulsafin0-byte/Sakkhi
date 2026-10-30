import React from "react";
import Link from "next/link";

export const Footer: React.FC = () => {
  const isPayPalSimulated =
    !process.env.PAYPAL_CLIENT_ID ||
    !process.env.PAYPAL_CLIENT_SECRET ||
    process.env.DEMO_MODE === "true" ||
    process.env.DEMO_MODE === "1";

  const isAiSimulated =
    (process.env.AI_PROVIDER || "mock").toLowerCase() === "mock";

  return (
    <footer className="w-full border-t border-border-soft bg-paper-card py-10 px-4 sm:px-6 mt-auto">
      {/* Demo status banners */}
      {(isPayPalSimulated || isAiSimulated) && (
        <div className="mx-auto max-w-6xl mb-6 flex flex-wrap gap-2 text-xs font-mono">
          {isPayPalSimulated && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
              Demo mode: PayPal calls are simulated
            </span>
          )}
          {isAiSimulated && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-800 border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              Demo mode: AI results are simulated
            </span>
          )}
        </div>
      )}

      <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-left">
        <div className="space-y-1.5 max-w-md">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold text-ink">
              Sakkhi (সাক্ষী)
            </span>
            <span className="text-xs font-mono text-terracotta bg-terracotta-soft px-2 py-0.5 rounded-full font-semibold">
              Prototype
            </span>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            Sakkhi is a hackathon prototype running on PayPal Sandbox. No real money moves.
            Every receipt, voucher, and tamper verification is recorded for public audit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
          <Link
            href="/#campaigns"
            className="hover:text-terracotta underline underline-offset-4 min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            Campaigns
          </Link>
          <Link
            href="/how-it-works"
            className="hover:text-terracotta underline underline-offset-4 min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            Trust &amp; Verification Model
          </Link>
          <Link
            href="/design"
            className="hover:text-terracotta underline underline-offset-4 min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            Design Spec (/design)
          </Link>
          <Link
            href="/api/health"
            className="hover:text-terracotta underline underline-offset-4 min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            System Health
          </Link>
          <span className="text-ink-faint">© 2026 Sakkhi Project</span>
        </div>
      </div>
    </footer>
  );
};
