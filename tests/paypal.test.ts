import { describe, it, expect } from "vitest";
import {
  bdtToPoisha,
  poishaToBdt,
  poishaToUsdCents,
  usdCentsToPoisha,
  formatUsd,
  formatBdt,
  CURRENCY_CONFIG,
} from "@/lib/config";
import type { CaptureOrderResponse } from "@/lib/paypal/client";

/**
 * Pure verification helper mirroring server-side capture verification
 * in app/api/donations/capture-order/route.ts
 */
function verifyCapturedPayment(
  captureResponse: CaptureOrderResponse,
  expectedUsdCents: number
): { valid: boolean; error?: string; captureId?: string; capturedCents?: number } {
  if (captureResponse.status !== "COMPLETED") {
    return { valid: false, error: `PayPal order capture status is not COMPLETED: ${captureResponse.status}` };
  }

  const purchaseUnit = captureResponse.purchase_units?.[0];
  const capture = purchaseUnit?.payments?.captures?.[0];

  if (!capture || capture.status !== "COMPLETED") {
    return { valid: false, error: "Payment capture record missing or not completed by PayPal" };
  }

  if (capture.amount.currency_code !== "USD") {
    return {
      valid: false,
      error: `Currency mismatch: Expected USD, received ${capture.amount.currency_code}`,
    };
  }

  const capturedCents = Math.round(parseFloat(capture.amount.value) * 100);

  if (capturedCents !== expectedUsdCents) {
    return {
      valid: false,
      error: `Amount mismatch: Expected ${expectedUsdCents} USD cents, but captured ${capturedCents} USD cents`,
    };
  }

  return { valid: true, captureId: capture.id, capturedCents };
}

describe("PayPal & Currency Conversion Unit Tests", () => {
  describe("Amount Math & Exchange Rate (1 USD = 120 BDT)", () => {
    it("converts BDT poisha to USD cents accurately", () => {
      // 120 BDT = 12,000 poisha -> 100 cents ($1.00)
      expect(poishaToUsdCents(12000)).toBe(100);

      // 500 BDT = 50,000 poisha -> 417 cents ($4.17)
      expect(poishaToUsdCents(50000)).toBe(417);

      // 1,200 BDT = 120,000 poisha -> 1,000 cents ($10.00)
      expect(poishaToUsdCents(120000)).toBe(1000);

      // 2,500 BDT = 250,000 poisha -> 2,083 cents ($20.83)
      expect(poishaToUsdCents(250000)).toBe(2083);
    });

    it("converts USD cents to BDT poisha accurately", () => {
      // $1.00 = 100 cents -> 12,000 poisha (120 BDT)
      expect(usdCentsToPoisha(100)).toBe(12000);

      // $10.00 = 1000 cents -> 120,000 poisha (1,200 BDT)
      expect(usdCentsToPoisha(1000)).toBe(120000);

      // $50.00 = 5000 cents -> 600,000 poisha (6,000 BDT)
      expect(usdCentsToPoisha(5000)).toBe(600000);
    });

    it("guarantees integer output without floating-point drift", () => {
      const bdtAmount = 1437.5;
      const poisha = bdtToPoisha(bdtAmount);
      expect(Number.isInteger(poisha)).toBe(true);

      const usdCents = poishaToUsdCents(poisha);
      expect(Number.isInteger(usdCents)).toBe(true);

      const bdtBack = poishaToBdt(poisha);
      expect(bdtBack).toBe(1437.5);
    });

    it("formats USD and BDT currencies nicely for humans", () => {
      expect(formatUsd(417)).toBe("$4.17");
      expect(formatUsd(1000)).toBe("$10.00");
      expect(formatBdt(50000)).toBe("500 BDT");
      expect(formatBdt(9200000)).toBe("92,000 BDT");
    });
  });

  describe("Server-Side PayPal Capture Verification Logic", () => {
    it("validates a legitimate completed PayPal capture matching expected USD cents", () => {
      const mockPayPalResponse: CaptureOrderResponse = {
        id: "ORDER-VALID-001",
        status: "COMPLETED",
        payer: {
          email_address: "buyer@sandbox.paypal.com",
          payer_id: "SANDBOX-BUYER-01",
        },
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "CAP-001-SUCCESS",
                  status: "COMPLETED",
                  amount: {
                    currency_code: "USD",
                    value: "4.17", // 417 USD cents (~500 BDT)
                  },
                },
              ],
            },
          },
        ],
      };

      const result = verifyCapturedPayment(mockPayPalResponse, 417);
      expect(result.valid).toBe(true);
      expect(result.captureId).toBe("CAP-001-SUCCESS");
      expect(result.capturedCents).toBe(417);
      expect(result.error).toBeUndefined();
    });

    it("detects and rejects an amount tampering attempt", () => {
      // Expected 417 cents ($4.17), but client attempts to approve with $0.50 (50 cents)
      const tamperedMockResponse: CaptureOrderResponse = {
        id: "ORDER-TAMPERED-002",
        status: "COMPLETED",
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "CAP-TAMPERED-002",
                  status: "COMPLETED",
                  amount: {
                    currency_code: "USD",
                    value: "0.50",
                  },
                },
              ],
            },
          },
        ],
      };

      const result = verifyCapturedPayment(tamperedMockResponse, 417);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Amount mismatch: Expected 417 USD cents, but captured 50 USD cents");
    });

    it("detects and rejects a currency mismatch", () => {
      const foreignCurrencyResponse: CaptureOrderResponse = {
        id: "ORDER-CURRENCY-003",
        status: "COMPLETED",
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "CAP-EUR-003",
                  status: "COMPLETED",
                  amount: {
                    currency_code: "EUR",
                    value: "4.17",
                  },
                },
              ],
            },
          },
        ],
      };

      const result = verifyCapturedPayment(foreignCurrencyResponse, 417);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Currency mismatch: Expected USD, received EUR");
    });

    it("rejects an incomplete or declined payment order", () => {
      const declinedResponse: CaptureOrderResponse = {
        id: "ORDER-DECLINED-004",
        status: "VOIDED",
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "CAP-DECLINED-004",
                  status: "DECLINED",
                  amount: {
                    currency_code: "USD",
                    value: "4.17",
                  },
                },
              ],
            },
          },
        ],
      };

      const result = verifyCapturedPayment(declinedResponse, 417);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("PayPal order capture status is not COMPLETED: VOIDED");
    });
  });
});

