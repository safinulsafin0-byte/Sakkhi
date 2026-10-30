import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-soft bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 min-h-[64px]">
        {/* Brand Wordmark */}
        <Link
          href="/"
          className="group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta rounded-md p-1 min-h-[44px] justify-center"
        >
          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ink group-hover:text-terracotta transition-colors">
            Sakkhi
          </span>
          <span className="text-[11px] sm:text-xs text-ink-muted tracking-wide font-sans -mt-0.5">
            every taka, witnessed
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/#campaigns"
            className="text-sm font-medium text-ink-muted hover:text-terracotta transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-2 sm:px-3 rounded-lg focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            Campaigns
          </Link>
          <Link
            href="/how-it-works"
            className="text-sm font-medium text-ink-muted hover:text-terracotta transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-2 sm:px-3 rounded-lg focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            How It Works
          </Link>
          <Link
            href="/design"
            className="hidden md:inline-flex text-sm font-medium text-ink-muted hover:text-terracotta transition-colors min-h-[44px] min-w-[44px] items-center justify-center px-2 sm:px-3 rounded-lg focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            Design
          </Link>
          <Link href="/#campaigns" className="ml-1 sm:ml-2">
            <Button size="sm" variant="primary">
              Support a Cause
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};
