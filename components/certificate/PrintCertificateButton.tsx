"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

export function PrintCertificateButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      onClick={() => window.print()}
      className="print:hidden flex items-center gap-2"
    >
      <span>🖨️</span> Print / Save Certificate PDF
    </Button>
  );
}

