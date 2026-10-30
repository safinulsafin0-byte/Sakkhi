import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HandUnderline } from "@/components/ui/HandUnderline";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 py-12 px-4 max-w-xl mx-auto">
      <span className="font-mono text-xs uppercase tracking-widest text-terracotta font-semibold">
        Error 404 • Missing Proof
      </span>

      <div className="space-y-2">
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink">
          This page hasn&apos;t been witnessed yet.
        </h1>
        <HandUnderline className="max-w-[240px] sm:max-w-[320px] mx-auto text-terracotta" />
      </div>

      <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
        We searched our public ledger and milestone archives, but could not find the page
        or campaign you were looking for. It may have been completed, moved, or the link might have a typo.
      </p>

      <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
        <Link href="/">
          <Button variant="primary" size="lg">
            Return to Active Campaigns
          </Button>
        </Link>
        <Link href="/how-it-works">
          <Button variant="secondary" size="lg">
            Read How Sakkhi Works
          </Button>
        </Link>
      </div>
    </div>
  );
}

