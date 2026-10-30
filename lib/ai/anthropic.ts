import { Verifier, VerificationInput, VerificationResult, VerificationResultSchema } from "./types";
import { VERIFIER_SYSTEM_PROMPT, buildVerificationPrompt } from "./prompts";
import { env } from "../env";

export class AnthropicVerifier implements Verifier {
  readonly providerName = "anthropic";
  readonly isDemo = false;
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || env.ANTHROPIC_API_KEY || env.AI_API_KEY;
    this.apiKey = key || "";
  }

  async verify(input: VerificationInput): Promise<VerificationResult> {
    if (!this.apiKey) {
      return {
        verdict: "needs_more_proof",
        confidence: 0.0,
        receiptTotal: null,
        receiptCurrency: input.currency,
        receiptDate: null,
        checklist: input.proofChecklist.map((item) => ({
          item,
          satisfied: false,
          evidence: "Setup required: ANTHROPIC_API_KEY is not configured in .env.local.",
        })),
        redFlags: [
          "Anthropic verifier requested but ANTHROPIC_API_KEY is missing. Set ANTHROPIC_API_KEY or use AI_PROVIDER=mock.",
        ],
        humanSummary:
          "Automated verification could not connect because the Anthropic API key is not configured. Community funds remain safely held in escrow. Please configure ANTHROPIC_API_KEY in .env.local or switch to mock/demo mode.",
        needsHumanReview: true,
        provider: "anthropic",
        isDemoMode: true,
      };
    }

    const promptText = buildVerificationPrompt(input);

    const content: any[] = [];
    for (const img of input.images) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mimeType,
          data: img.base64,
        },
      });
    }
    content.push({ type: "text", text: promptText });

    const payload = {
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2000,
      system: VERIFIER_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error [${res.status}]: ${errText.slice(0, 300)}`);
    }

    const json = await res.json();
    const candidateText = json.content?.[0]?.text || "";

    if (!candidateText) {
      throw new Error("Anthropic returned an empty response");
    }

    let parsed: any;
    try {
      let cleaned = candidateText.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      parsed = JSON.parse(cleaned);
    } catch (e: any) {
      throw new Error(`Failed to parse Anthropic response as JSON: ${e.message}`);
    }

    const validated = VerificationResultSchema.parse({
      ...parsed,
      provider: "anthropic",
      isDemoMode: false,
      rawModelOutput: candidateText,
    });

    return validated;
  }
}

