import { Verifier, VerificationInput, VerificationResult } from "./types";
import { MockVerifier } from "./mock";
import { GeminiVerifier } from "./gemini";
import { AnthropicVerifier } from "./anthropic";
import { runPreChecks, applyDeterministicPostChecks } from "./deterministic";
import { env } from "../env";

export class MissingApiKeyVerifier implements Verifier {
  readonly isDemo = true;
  constructor(readonly providerName: string) {}

  async verify(input: VerificationInput): Promise<VerificationResult> {
    const providerUpper = this.providerName.toUpperCase();
    const keyEnvVar =
      this.providerName === "gemini"
        ? "GEMINI_API_KEY"
        : this.providerName === "anthropic"
        ? "ANTHROPIC_API_KEY"
        : "AI_API_KEY";

    return {
      verdict: "needs_more_proof",
      confidence: 0.0,
      receiptTotal: null,
      receiptCurrency: input.currency,
      receiptDate: null,
      checklist: input.proofChecklist.map((item) => ({
        item,
        satisfied: false,
        evidence: `Setup required: Provider "${this.providerName}" requires an API key (${keyEnvVar}) in your .env file.`,
      })),
      redFlags: [
        `AI provider "${this.providerName}" is selected but ${keyEnvVar} is not configured in .env.local. Community funds remain safe in escrow.`,
      ],
      humanSummary: `Automated AI verification could not run because the ${providerUpper} API key is not configured. Community funds remain safely locked in escrow and have not moved. To enable live AI verification, add ${keyEnvVar} to your .env.local file, or use AI_PROVIDER=mock for demo mode.`,
      needsHumanReview: true,
      provider: this.providerName,
      isDemoMode: true,
      rawModelOutput: JSON.stringify({
        setupRequired: true,
        missingKey: keyEnvVar,
        suggestedFix: `Add ${keyEnvVar}=your_key to .env.local or set AI_PROVIDER=mock`,
      }),
    };
  }
}

/**
 * Factory selecting the active AI provider.
 * Supports "mock" (default demo mode), "gemini", or "anthropic".
 * If a live provider key is missing, returns a friendly setup verifier instead of crashing.
 */
export function getVerifier(providerName?: string): Verifier {
  const chosen = (providerName || env.AI_PROVIDER || "mock").toLowerCase();

  switch (chosen) {
    case "gemini": {
      const key = env.GEMINI_API_KEY || env.AI_API_KEY;
      if (!key) {
        return new MissingApiKeyVerifier("gemini");
      }
      return new GeminiVerifier(key);
    }
    case "anthropic": {
      const key = env.ANTHROPIC_API_KEY || env.AI_API_KEY;
      if (!key) {
        return new MissingApiKeyVerifier("anthropic");
      }
      return new AnthropicVerifier(key);
    }
    case "mock":
    default:
      return new MockVerifier();
  }
}

/**
 * Executes a function with a timeout and retry with exponential backoff.
 * 60-second default timeout per user requirements.
 */
async function withRetryAndTimeout<T>(
  action: () => Promise<T>,
  timeoutMs = 60000,
  maxRetries = 2
): Promise<T> {
  let attempt = 0;
  let delay = 1000;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await Promise.race([
        action(),
        new Promise<T>((_, reject) => {
          controller.signal.addEventListener("abort", () =>
            reject(new Error(`Verification timed out after ${timeoutMs / 1000} seconds`))
          );
        }),
      ]);
      clearTimeout(timeoutId);
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isLastAttempt = attempt > maxRetries;
      if (isLastAttempt) {
        throw err;
      }
      // Wait with exponential backoff before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error("Maximum retry attempts reached");
}

/**
 * End-to-end verification pipeline:
 * 1. Deterministic pre-checks (duplicate hashes, EXIF timestamp vs campaign date).
 * 2. Model verification with timeout, retries, and backoff.
 * 3. Deterministic post-checks (10% budget variance, confidence < 0.75, red flags).
 * 4. Safe failure fallback (never releases funds on error).
 */
export async function verifyMilestoneProof(
  input: VerificationInput,
  options?: {
    provider?: string;
    verifier?: Verifier;
    currentMilestoneId?: string;
    timeoutMs?: number;
  }
): Promise<VerificationResult> {
  const provider = options?.verifier || getVerifier(options?.provider);

  // 1. Deterministic Pre-Checks
  const preCheck = await runPreChecks(input, options?.currentMilestoneId);
  if (preCheck.isRejected && preCheck.rejectionResult) {
    return preCheck.rejectionResult;
  }

  // 2. Call Verifier with Timeout & Retry
  let rawResult: VerificationResult;
  try {
    rawResult = await withRetryAndTimeout(
      () => provider.verify(input),
      options?.timeoutMs || 60000,
      2
    );
  } catch (error: any) {
    // Safe failure state that never releases money
    return {
      verdict: "needs_more_proof",
      confidence: 0.0,
      receiptTotal: null,
      receiptCurrency: input.currency,
      receiptDate: null,
      checklist: input.proofChecklist.map((item) => ({
        item,
        satisfied: false,
        evidence: "Verification incomplete: Automated audit error; funds retained in escrow.",
      })),
      redFlags: [
        `Automated verification error: ${error.message || "Timeout or provider unavailable"}`,
      ],
      humanSummary:
        "The automated integrity scan encountered a timeout while communicating with the verification provider. Community funds remain safely locked in escrow and have not moved. A coordinator will review this submission manually.",
      needsHumanReview: true,
      provider: provider.providerName,
      isDemoMode: provider.isDemo,
      rawModelOutput: JSON.stringify({ error: error.message }),
    };
  }

  // 3. Deterministic Post-Checks
  const finalResult = applyDeterministicPostChecks(
    rawResult,
    input,
    preCheck.additionalRedFlags
  );

  return finalResult;
}

export * from "./types";
