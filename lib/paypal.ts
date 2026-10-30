import { env } from "./env";

export interface PayPalOrderParams {
  amount: number;
  currency?: string;
  referenceId: string;
}

export async function createPayPalOrder(params: PayPalOrderParams) {
  if (env.AI_PROVIDER === "mock" || env.DEMO_MODE) {
    return {
      id: `MOCK-ORDER-${Date.now()}`,
      status: "CREATED",
      approvalUrl: `http://localhost:3000/demo-checkout?orderId=MOCK-${Date.now()}`,
    };
  }

  throw new Error("Live PayPal configuration required when not in demo/mock mode.");
}

