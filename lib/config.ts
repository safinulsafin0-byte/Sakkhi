/**
 * Sakkhi Financial & Currency Configuration
 *
 * Money Rules:
 * 1. All amounts in the database are stored as INTEGERS in the smallest unit.
 *    - BDT is stored in Poisha (1 BDT = 100 Poisha). E.g. 5,000 BDT = 500,000 Poisha.
 *    - USD is stored in Cents (1 USD = 100 Cents). E.g. $10.00 = 1000 Cents.
 * 2. Campaign ledger balances and display values are maintained natively in BDT.
 * 3. PayPal Sandbox transactions are denominated in USD.
 *    - Fixed rate: 1 USD = 120 BDT.
 *    - 1 USD Cent = 1.20 BDT = 120 Poisha.
 */

export const CURRENCY_CONFIG = {
  DEFAULT_CURRENCY: "BDT",
  PAYPAL_CURRENCY: "USD",
  USD_TO_BDT_RATE: 120, // 1 USD = 120 BDT
  BDT_TO_USD_RATE: 1 / 120, // 1 BDT = 0.008333... USD
  POISHA_PER_BDT: 100,
  CENTS_PER_USD: 100,
} as const;

/**
 * Converts Bangladeshi Taka (decimal/float) to Poisha (integer).
 */
export function bdtToPoisha(bdt: number): number {
  return Math.round(bdt * CURRENCY_CONFIG.POISHA_PER_BDT);
}

/**
 * Converts Poisha (integer) to Bangladeshi Taka (float).
 */
export function poishaToBdt(poisha: number): number {
  return poisha / CURRENCY_CONFIG.POISHA_PER_BDT;
}

/**
 * Formats a Poisha amount into a human-readable BDT string like "9,200 BDT".
 */
export function formatBdt(poisha: number, includeCurrency = true): string {
  const bdt = poishaToBdt(poisha);
  const formatted = bdt.toLocaleString("en-US", {
    minimumFractionDigits: bdt % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return includeCurrency ? `${formatted} BDT` : formatted;
}

/**
 * Converts BDT Poisha to USD Cents using the fixed documented exchange rate.
 * Formula: (poisha / 100) / 120 * 100 = poisha / 120
 */
export function poishaToUsdCents(poisha: number): number {
  return Math.round(poisha / CURRENCY_CONFIG.USD_TO_BDT_RATE);
}

/**
 * Converts USD Cents to BDT Poisha using the fixed documented exchange rate.
 * Formula: (cents / 100) * 120 * 100 = cents * 120
 */
export function usdCentsToPoisha(cents: number): number {
  return Math.round(cents * CURRENCY_CONFIG.USD_TO_BDT_RATE);
}

/**
 * Formats a USD Cents amount into a human-readable USD string like "$10.00".
 */
export function formatUsd(cents: number): string {
  const usd = cents / CURRENCY_CONFIG.CENTS_PER_USD;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usd);
}

