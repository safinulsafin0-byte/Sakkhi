import { env } from "@/lib/env";

export class PayPalApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "PayPalApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class PayPalAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayPalAuthError";
  }
}

export class PayPalTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayPalTimeoutError";
  }
}

// In-memory cache for OAuth2 access token
interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

let tokenCache: CachedToken | null = null;

export const PAYPAL_SANDBOX_BASE_URL = "https://api-m.sandbox.paypal.com";

/**
 * Returns the configured PayPal client ID and secret.
 * Throws PayPalAuthError if credentials are not configured.
 */
function getCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID || env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new PayPalAuthError(
      "PayPal Sandbox credentials missing. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.local."
    );
  }

  return { clientId, clientSecret };
}

/**
 * Fetches or returns cached PayPal OAuth2 access token.
 * Refreshes 120 seconds before actual token expiry.
 */
export async function getPayPalAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now();

  if (!forceRefresh && tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret } = getCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${PAYPAL_SANDBOX_BASE_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      // Never log the secret or credentials
      throw new PayPalAuthError(
        `PayPal OAuth2 authentication failed [HTTP ${res.status}]: ${
          errBody.error_description || errBody.message || res.statusText
        }`
      );
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    const bufferSeconds = 120;
    const ttlSeconds = Math.max(30, (data.expires_in || 3600) - bufferSeconds);

    tokenCache = {
      accessToken: data.access_token,
      expiresAt: now + ttlSeconds * 1000,
    };

    return tokenCache.accessToken;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new PayPalTimeoutError("PayPal OAuth token request timed out after 10000ms.");
    }
    if (error instanceof PayPalAuthError) throw error;
    throw new PayPalAuthError(`PayPal token request failed: ${error.message}`);
  }
}

export interface PayPalRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  requestId?: string; // Passed as PayPal-Request-Id for idempotency
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * Executes an authenticated request against the PayPal Sandbox REST API.
 * - Injects Bearer token
 * - Attaches PayPal-Request-Id header for idempotent mutations
 * - Timeouts via AbortController (default 10s)
 * - Retries only on 5xx server errors with exponential backoff
 * - Never logs secrets
 */
export async function paypalRequest<T = any>(
  endpoint: string,
  options: PayPalRequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    requestId,
    timeoutMs = 10000,
    maxRetries = 2,
  } = options;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    const token = await getPayPalAccessToken(attempt > 0);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (requestId) {
      headers["PayPal-Request-Id"] = requestId;
    }

    try {
      const url = endpoint.startsWith("http")
        ? endpoint
        : `${PAYPAL_SANDBOX_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Success
      if (res.ok) {
        if (res.status === 204) {
          return {} as T;
        }
        return (await res.json()) as T;
      }

      // Check for 5xx server errors for retry eligibility
      if (res.status >= 500 && res.status <= 599 && attempt < maxRetries) {
        attempt++;
        const backoffMs = attempt * 300;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      // Client or non-retriable error
      const errorJson = await res.json().catch(() => ({}));
      throw new PayPalApiError(
        `PayPal API error [HTTP ${res.status}]: ${
          errorJson.message || errorJson.name || res.statusText
        }`,
        res.status,
        errorJson
      );
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === "AbortError") {
        lastError = new PayPalTimeoutError(`PayPal request to ${endpoint} timed out.`);
      } else {
        lastError = err;
      }

      // If it's a 5xx API error or network failure and we have retries left, loop
      if (
        (err instanceof PayPalTimeoutError ||
          (err instanceof PayPalApiError && err.statusCode >= 500)) &&
        attempt < maxRetries
      ) {
        attempt++;
        const backoffMs = attempt * 300;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new PayPalApiError("PayPal request failed after retries", 500);
}

// ---------------------------------------------------------------------------
// High-level PayPal Operations
// ---------------------------------------------------------------------------

export interface CreateOrderParams {
  amountUsdCents: number;
  currency?: string;
  description: string;
  customId?: string;
  requestId: string;
}

export interface PayPalOrderResponse {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  links: Array<{ href: string; rel: string; method: string }>;
  purchase_units: Array<{
    reference_id?: string;
    amount: {
      currency_code: string;
      value: string;
    };
    description?: string;
    custom_id?: string;
  }>;
}

/**
 * Creates a PayPal Order with intent "CAPTURE".
 */
export async function createPayPalOrder(params: CreateOrderParams): Promise<PayPalOrderResponse> {
  const { amountUsdCents, currency = "USD", description, customId, requestId } = params;
  const valueFormatted = (amountUsdCents / 100).toFixed(2);

  const isMock =
    (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET || env.DEMO_MODE);

  if (isMock) {
    return {
      id: `ORD-MOCK-${requestId.slice(-8)}-${Date.now()}`,
      status: "CREATED",
      links: [],
      purchase_units: [
        {
          description,
          custom_id: customId,
          amount: {
            currency_code: currency,
            value: valueFormatted,
          },
        },
      ],
    };
  }

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        description: description.slice(0, 127),
        custom_id: customId,
        amount: {
          currency_code: currency,
          value: valueFormatted,
        },
      },
    ],
  };

  return await paypalRequest<PayPalOrderResponse>("/v2/checkout/orders", {
    method: "POST",
    body: payload,
    requestId,
  });
}

export interface CaptureOrderResponse {
  id: string; // Order ID
  status: "COMPLETED" | "PARTIALLY_REFUNDED" | "VOIDED";
  payer?: {
    name?: { given_name?: string; surname?: string };
    email_address?: string;
    payer_id?: string;
  };
  purchase_units: Array<{
    payments?: {
      captures?: Array<{
        id: string; // Capture ID
        status: "COMPLETED" | "DECLINED" | "PARTIALLY_REFUNDED" | "PENDING" | "REFUNDED";
        amount: {
          currency_code: string;
          value: string;
        };
        final_capture?: boolean;
        seller_protection?: { status: string };
        create_time?: string;
        update_time?: string;
      }>;
    };
  }>;
}

/**
 * Captures payment for an approved PayPal Order.
 */
export async function capturePayPalOrder(
  orderId: string,
  requestId: string
): Promise<CaptureOrderResponse> {
  const isMock =
    (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET || env.DEMO_MODE);

  if (isMock) {
    let capturedVal = "4.17";
    try {
      const { prisma } = await import("@/lib/db");
      const d = await prisma.donation.findFirst({ where: { paypalOrderId: orderId } });
      if (d?.amountUsdCents) {
        capturedVal = (d.amountUsdCents / 100).toFixed(2);
      }
    } catch {
      // fallback to 4.17
    }

    return {
      id: orderId,
      status: "COMPLETED",
      purchase_units: [
        {
          payments: {
            captures: [
              {
                id: `CAP-MOCK-${orderId.slice(-8)}-${Date.now()}`,
                status: "COMPLETED",
                amount: {
                  currency_code: "USD",
                  value: capturedVal,
                },
              },
            ],
          },
        },
      ],
    };
  }

  return await paypalRequest<CaptureOrderResponse>(
    `/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      requestId,
    }
  );
}

/**
 * Retrieves details of a PayPal Order.
 */
export async function getPayPalOrder(orderId: string): Promise<PayPalOrderResponse> {
  return await paypalRequest<PayPalOrderResponse>(`/v2/checkout/orders/${orderId}`, {
    method: "GET",
  });
}

export interface VerifyWebhookParams {
  webhookId: string;
  webhookEvent: Record<string, any>;
  headers: {
    authAlgo: string;
    certUrl: string;
    transmissionId: string;
    transmissionSig: string;
    transmissionTime: string;
  };
}

export interface VerifyWebhookResponse {
  verification_status: "SUCCESS" | "FAILURE";
}

/**
 * Verifies PayPal Webhook signature via PayPal's verify-webhook-signature endpoint.
 */
export async function verifyPayPalWebhookSignature(
  params: VerifyWebhookParams
): Promise<boolean> {
  const { webhookId, webhookEvent, headers } = params;

  const payload = {
    auth_algo: headers.authAlgo,
    cert_url: headers.certUrl,
    transmission_id: headers.transmissionId,
    transmission_sig: headers.transmissionSig,
    transmission_time: headers.transmissionTime,
    webhook_id: webhookId,
    webhook_event: webhookEvent,
  };

  try {
    const res = await paypalRequest<VerifyWebhookResponse>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: payload,
      }
    );

    return res.verification_status === "SUCCESS";
  } catch (err) {
    return false;
  }
}

export interface PayPalRefundResponse {
  id: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  amount: {
    value: string;
    currency_code: string;
  };
  note_to_payer?: string;
}

/**
 * Refunds a captured PayPal payment.
 * Supports partial amounts and attaches PayPal-Request-Id for idempotency.
 */
export async function refundPayPalCapture(params: {
  captureId: string;
  amountUsdCents: number;
  currency?: string;
  note?: string;
  requestId: string;
}): Promise<PayPalRefundResponse> {
  const { captureId, amountUsdCents, currency = "USD", note, requestId } = params;

  const isMock =
    env.AI_PROVIDER === "mock" && (!process.env.PAYPAL_CLIENT_ID || env.DEMO_MODE);

  if (isMock) {
    return {
      id: `REF-MOCK-${captureId.slice(-8)}-${Date.now()}`,
      status: "COMPLETED",
      amount: {
        value: (amountUsdCents / 100).toFixed(2),
        currency_code: currency,
      },
      note_to_payer: note,
    };
  }

  const payload = {
    amount: {
      value: (amountUsdCents / 100).toFixed(2),
      currency_code: currency,
    },
    note_to_payer: note || "Sakkhi community milestone refund",
  };

  return await paypalRequest<PayPalRefundResponse>(
    `/v2/payments/captures/${captureId}/refund`,
    {
      method: "POST",
      body: payload,
      requestId,
    }
  );
}

