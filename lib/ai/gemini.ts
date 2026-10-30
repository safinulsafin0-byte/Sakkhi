import { Verifier, VerificationInput, VerificationResult, VerificationResultSchema } from "./types";
import { VERIFIER_SYSTEM_PROMPT, buildVerificationPrompt } from "./prompts";
import { env } from "../env";

export class GeminiVerifier implements Verifier {
  readonly providerName = "gemini";
  readonly isDemo = false;
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || env.GEMINI_API_KEY || env.AI_API_KEY;
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
          evidence: "Setup required: GEMINI_API_KEY is not configured in .env.local.",
        })),
        redFlags: [
          "Gemini verifier requested but GEMINI_API_KEY is missing. Set GEMINI_API_KEY or use AI_PROVIDER=mock.",
        ],
        humanSummary:
          "Automated verification could not connect because the Gemini API key is not configured. Community funds remain safely held in escrow. Please configure GEMINI_API_KEY in .env.local or switch to mock/demo mode.",
        needsHumanReview: true,
        provider: "gemini",
        isDemoMode: true,
      };
    }

    const promptText = buildVerificationPrompt(input);

    const parts: any[] = [{ text: promptText }];
    for (const img of input.images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: VERIFIER_SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error [${res.status}]: ${errText.slice(0, 300)}`);
    }

    const json = await res.json();
    const candidateText =
      json.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!candidateText) {
      throw new Error("Gemini returned an empty response");
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
      throw new Error(`Failed to parse Gemini response as JSON: ${e.message}`);
    }

    const validated = VerificationResultSchema.parse({
      ...parsed,
      provider: "gemini",
      isDemoMode: false,
      rawModelOutput: candidateText,
    });

    return validated;
  }
}

