export * from "./types";
export * from "./prompts";
export * from "./mock";
export * from "./gemini";
export * from "./anthropic";
export * from "./deterministic";
export * from "./verifier";

// Backwards-compatible legacy interfaces if referenced
export interface AiAnalysisResult {
  tamperScore: number;
  verdict: "CLEAN" | "SUSPICIOUS" | "TAMPERED";
  summary: string;
}

export interface AiProvider {
  analyze(fileInfo: { filename: string; sha256: string; metadata?: Record<string, unknown> }): Promise<AiAnalysisResult>;
}
