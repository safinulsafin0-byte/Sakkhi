"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { HandUnderline } from "@/components/ui/HandUnderline";

export const AdminLoginForm: React.FC = () => {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Incorrect coordinator passcode");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Passcode verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 space-y-6">
      <div className="text-center space-y-2">
        <span className="font-mono text-xs uppercase tracking-widest text-terracotta font-semibold">
          Coordinator Access
        </span>
        <h1 className="font-serif text-3xl font-bold text-ink">
          Sakkhi Admin Area
        </h1>
        <HandUnderline className="max-w-[200px] mx-auto text-terracotta" />
        <p className="text-sm text-ink-muted pt-1">
          Enter the coordinator passcode to manage campaigns, add milestones, and generate volunteer invite links.
        </p>
      </div>

      <Card className="p-6 sm:p-8 bg-paper-card border-border-soft space-y-5 shadow-sm">
        {error && (
          <div className="p-3 text-xs bg-terracotta-soft text-terracotta rounded-lg border border-terracotta/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="admin-passcode"
              className="block text-xs font-semibold text-ink-muted uppercase tracking-wider"
            >
              Coordinator Passcode
            </label>
            <input
              id="admin-passcode"
              type="password"
              required
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode (default: sakkhi2026)"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-border-soft bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta font-mono"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !passcode}
            variant="primary"
            size="lg"
            className="w-full text-base font-semibold"
          >
            {isSubmitting ? "Verifying..." : "Enter Coordinator Area"}
          </Button>
        </form>

        <p className="text-[11px] text-ink-muted text-center">
          Passcode is set via <code>ADMIN_PASSCODE</code> in <code>.env.local</code> (demo default: <code>sakkhi2026</code>).
        </p>
      </Card>
    </div>
  );
};

