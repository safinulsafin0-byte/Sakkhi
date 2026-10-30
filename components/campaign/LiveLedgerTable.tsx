"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { poishaToBdt } from "@/lib/config";
import { cn } from "@/lib/utils";

export interface LedgerRowData {
  id: string;
  createdAt: string;
  type: string;
  amountPoisha: number;
  runningBalancePoisha: number;
  description?: string | null;
  idempotencyKey: string;
  donationDonorName?: string | null;
  milestoneTitle?: string | null;
  milestoneId?: string | null;
}

interface LiveLedgerTableProps {
  campaignTitle: string;
  campaignSlug: string;
  currency: string;
  initialEntries: LedgerRowData[];
}

export const LiveLedgerTable: React.FC<LiveLedgerTableProps> = ({
  campaignTitle,
  campaignSlug,
  currency,
  initialEntries,
}) => {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  // Filter and sort entries
  const processedEntries = useMemo(() => {
    let result = [...initialEntries];

    if (filterType !== "ALL") {
      result = result.filter((e) => e.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.donationDonorName && e.donationDonorName.toLowerCase().includes(q)) ||
          (e.milestoneTitle && e.milestoneTitle.toLowerCase().includes(q)) ||
          e.idempotencyKey.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [initialEntries, filterType, searchQuery, sortDirection]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      "Date",
      "Transaction ID",
      "Type",
      "Description",
      "Donor / Milestone",
      `Amount (${currency})`,
      `Running Balance (${currency})`,
      "Idempotency Key",
    ];

    const rows = processedEntries.map((e) => {
      const dateStr = new Date(e.createdAt).toISOString();
      const typeLabel = e.type;
      const desc = `"${(e.description || "").replace(/"/g, '""')}"`;
      const party = `"${(e.donationDonorName || e.milestoneTitle || "").replace(/"/g, '""')}"`;
      const amount = (poishaToBdt(e.amountPoisha)).toFixed(2);
      const running = (poishaToBdt(e.runningBalancePoisha)).toFixed(2);
      return [dateStr, e.id, typeLabel, desc, party, amount, running, e.idempotencyKey].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sakkhi-ledger-${campaignSlug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "CREDIT_DONATION":
        return <Badge variant="forest">Credit: Donation In</Badge>;
      case "RELEASE_PAYMENT":
        return <Badge variant="terracotta">Debit: Milestone Payout</Badge>;
      case "RESERVE_MILESTONE":
        return <Badge variant="amber">Earmarked Reserve</Badge>;
      case "REFUND":
        return <Badge variant="default">Debit: Donor Refund</Badge>;
      case "DISBURSEMENT_REVERSAL":
        return <Badge variant="forest">Credit: Payout Reversal</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search, Filter & Export Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-paper-card p-4 rounded-xl border border-border-soft">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search donors, milestones, refs..."
            className="px-3 py-2 rounded-lg border border-border-soft bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-terracotta min-h-[44px] min-w-[220px]"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border-soft bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta min-h-[44px]"
          >
            <option value="ALL">All Transaction Types</option>
            <option value="CREDIT_DONATION">Donations In (Credit)</option>
            <option value="RELEASE_PAYMENT">Milestone Disbursements (Debit)</option>
            <option value="RESERVE_MILESTONE">Earmarked Reserves</option>
            <option value="REFUND">Refunds</option>
          </select>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSortDirection(sortDirection === "desc" ? "asc" : "desc")}
            className="min-h-[44px]"
          >
            Date: {sortDirection === "desc" ? "Newest First ↓" : "Oldest First ↑"}
          </Button>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleExportCsv}
          className="flex items-center gap-2 min-h-[44px] whitespace-nowrap self-end sm:self-auto"
        >
          <span>📥</span> Export CSV ({processedEntries.length} records)
        </Button>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-border-soft bg-paper-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-sm">
            <thead>
              <tr className="bg-paper-dark border-b border-border-soft text-ink-muted font-mono text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Date &amp; Time</th>
                <th className="py-3.5 px-4 font-semibold">Transaction Type</th>
                <th className="py-3.5 px-4 font-semibold">Description &amp; Context</th>
                <th className="py-3.5 px-4 font-semibold text-right">Amount ({currency})</th>
                <th className="py-3.5 px-4 font-semibold text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft/60">
              {processedEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-ink-muted">
                    No ledger transactions found matching your search.
                  </td>
                </tr>
              ) : (
                processedEntries.map((row) => {
                  const isCredit =
                    row.type === "CREDIT_DONATION" || row.type === "DISBURSEMENT_REVERSAL";
                  const isDebit = row.type === "RELEASE_PAYMENT" || row.type === "REFUND";
                  const amountBdt = poishaToBdt(row.amountPoisha);
                  const balanceBdt = poishaToBdt(row.runningBalancePoisha);

                  const dateObj = new Date(row.createdAt);
                  const formattedDate = dateObj.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const formattedTime = dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-paper/50 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-xs text-ink-muted whitespace-nowrap">
                        <span className="font-semibold text-ink block">{formattedDate}</span>
                        <span>{formattedTime}</span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getTypeBadge(row.type)}
                      </td>

                      {/* Description & Party */}
                      <td className="py-3 px-4 max-w-md">
                        <p className="text-ink leading-snug font-medium">
                          {row.description || (row.type === "CREDIT_DONATION" ? `Donation from ${row.donationDonorName || "Anonymous"}` : `Disbursement for ${row.milestoneTitle || "Milestone"}`)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-mono text-ink-muted">
                          {row.donationDonorName && <span>Donor: {row.donationDonorName}</span>}
                          {row.milestoneTitle && <span>Milestone: {row.milestoneTitle}</span>}
                          <span className="truncate max-w-[180px]" title={row.idempotencyKey}>
                            Ref: {row.idempotencyKey}
                          </span>
                        </div>
                      </td>

                      {/* Transaction Amount */}
                      <td className="py-3 px-4 text-right font-serif text-base whitespace-nowrap">
                        <span
                          className={cn(
                            "font-bold",
                            isCredit
                              ? "text-forest"
                              : isDebit
                              ? "text-terracotta"
                              : "text-ink"
                          )}
                        >
                          {isCredit ? "+" : isDebit ? "-" : ""}৳{amountBdt.toLocaleString()}
                        </span>
                      </td>

                      {/* Running Balance */}
                      <td className="py-3 px-4 text-right font-serif text-base font-bold text-ink whitespace-nowrap bg-paper/30">
                        ৳{balanceBdt.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

