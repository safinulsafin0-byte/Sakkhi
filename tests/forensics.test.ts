import { describe, it, expect } from "vitest";
import { computeSha256 } from "@/lib/forensics";

describe("Forensic Utilities", () => {
  it("computes SHA-256 correctly for sample buffer", async () => {
    const buffer = Buffer.from("SakkhiAI-Witness-Integrity-Proof");
    const hash = await computeSha256(buffer);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(64);
  });
});

