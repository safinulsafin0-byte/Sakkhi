import { Verifier, VerificationInput, VerificationResult } from "./types";
import { poishaToBdt } from "../config";

export class MockVerifier implements Verifier {
  readonly providerName = "mock";
  readonly isDemo = true;

  async verify(input: VerificationInput): Promise<VerificationResult> {
    const expectedBdt = poishaToBdt(input.expectedAmount);
    const filenames = input.images.map((img) => img.filename.toLowerCase()).join(" ");
    const note = (input.volunteerNote || "").toLowerCase();

    // 1. Rejected: Tampered / Fake image
    if (
      filenames.includes("tampered") ||
      filenames.includes("fake") ||
      filenames.includes("forged") ||
      filenames.includes("photoshop")
    ) {
      return {
        verdict: "rejected",
        confidence: 0.92,
        receiptTotal: null,
        receiptCurrency: input.currency,
        receiptDate: null,
        checklist: input.proofChecklist.map((item) => ({
          item,
          satisfied: false,
          evidence: "Rejected: Digital image manipulation and abnormal noise patterns detected.",
        })),
        redFlags: [
          "Irregular quantization artifacts detected around handwritten total",
          "Digital inpainting and cloning inconsistencies identified on paper voucher",
        ],
        humanSummary:
          "Forensic inspection detected digital inpainting and irregular pixel artifacts on the submitted voucher. The evidence does not meet tamper verification standards.",
        needsHumanReview: true,
        provider: "mock",
        isDemoMode: true,
        rawModelOutput: JSON.stringify({ mockRule: "tampered_filename" }),
      };
    }

    // 2. Needs More Proof: Blurry / Missing proof
    if (
      filenames.includes("blurry") ||
      filenames.includes("unclear") ||
      filenames.includes("missing") ||
      filenames.includes("partial")
    ) {
      return {
        verdict: "needs_more_proof",
        confidence: 0.58,
        receiptTotal: null,
        receiptCurrency: input.currency,
        receiptDate: null,
        checklist: input.proofChecklist.map((item, idx) => ({
          item,
          satisfied: idx === 0 ? false : true,
          evidence:
            idx === 0
              ? "Image is out of focus; numbers and stamp are obscured."
              : "Field photo visible but requires accompanying legible voucher.",
        })),
        redFlags: [
          "Receipt memo is out of focus and final transaction numbers cannot be verified",
        ],
        humanSummary:
          "The submitted receipt image is blurred and key transaction details could not be read with certainty. A clearer photo of the paper memo has been requested from the volunteer.",
        needsHumanReview: true,
        provider: "mock",
        isDemoMode: true,
        rawModelOutput: JSON.stringify({ mockRule: "blurry_filename" }),
      };
    }

    // 2b. Bangla Script Receipt: Accurately read Bangla numerals (e.g. ১২,০০০ টাকা)
    if (
      filenames.includes("bangla") ||
      filenames.includes("bengali") ||
      filenames.includes("bn") ||
      note.includes("বাংলা") ||
      note.includes("টাকা")
    ) {
      return {
        verdict: "approved",
        confidence: 0.94,
        receiptTotal: expectedBdt,
        receiptCurrency: "BDT",
        receiptDate: new Date().toISOString().split("T")[0],
        checklist: input.proofChecklist.map((item) => ({
          item,
          satisfied: true,
          evidence: `Bangla script cash memo verified (বাংলা সংখ্যায় মুদ্রিত বা হস্তলিখিত ${expectedBdt.toLocaleString()} টাকা parsed as ${expectedBdt.toLocaleString()} BDT).`,
        })),
        redFlags: [],
        humanSummary: `We verified the vendor cash memo in Bangla script for "${input.milestoneTitle}". The Bangla numerals were parsed accurately as ${expectedBdt.toLocaleString()} BDT matching the milestone allocation, and ground distribution photos confirm delivery.`,
        needsHumanReview: false,
        provider: "mock",
        isDemoMode: true,
        rawModelOutput: JSON.stringify({ mockRule: "bangla_script_recognized", parsedAmountBdt: expectedBdt }),
      };
    }

    // 3. Amount Mismatch: e.g. receipt total exceeds budget by 50%
    if (filenames.includes("mismatch") || filenames.includes("overbudget")) {
      const overAmount = Math.round(expectedBdt * 1.5);
      return {
        verdict: "approved", // Note: downstream deterministic checks will catch and downgrade this!
        confidence: 0.88,
        receiptTotal: overAmount,
        receiptCurrency: input.currency,
        receiptDate: new Date().toISOString().split("T")[0],
        checklist: input.proofChecklist.map((item) => ({
          item,
          satisfied: true,
          evidence: `Voucher legible with reported total of ${overAmount.toLocaleString()} BDT.`,
        })),
        redFlags: [],
        humanSummary: `The vendor receipt is legible but indicates an expenditure of ${overAmount.toLocaleString()} BDT against an allocated budget of ${expectedBdt.toLocaleString()} BDT.`,
        needsHumanReview: false,
        provider: "mock",
        isDemoMode: true,
        rawModelOutput: JSON.stringify({ mockRule: "mismatch_filename", reportedAmount: overAmount }),
      };
    }

    // 4. Low Confidence
    if (filenames.includes("lowconfidence") || note.includes("low confidence")) {
      return {
        verdict: "approved", // Downstream deterministic checks will downgrade to needs_more_proof
        confidence: 0.62,
        receiptTotal: expectedBdt,
        receiptCurrency: input.currency,
        receiptDate: new Date().toISOString().split("T")[0],
        checklist: input.proofChecklist.map((item) => ({
          item,
          satisfied: true,
          evidence: "Photo shows supplies but low contrast reduces audit certainty.",
        })),
        redFlags: ["Sub-optimal lighting conditions reduce OCR confidence score below 75%"],
        humanSummary:
          "The documentation appears genuine, but low lighting on the paper voucher reduces overall audit certainty.",
        needsHumanReview: false,
        provider: "mock",
        isDemoMode: true,
        rawModelOutput: JSON.stringify({ mockRule: "low_confidence" }),
      };
    }

    // 5. Default Clean Approved Path (Realistic for demo)
    return {
      verdict: "approved",
      confidence: 0.95,
      receiptTotal: expectedBdt,
      receiptCurrency: input.currency,
      receiptDate: new Date().toISOString().split("T")[0],
      checklist: input.proofChecklist.map((item) => ({
        item,
        satisfied: true,
        evidence: `Clearly verified in submitted ground photographs and vendor cash memo for "${input.milestoneTitle}".`,
      })),
      redFlags: [],
      humanSummary: `We verified the vendor cash memo for "${input.milestoneTitle}", confirming ${expectedBdt.toLocaleString()} ${input.currency} spent as allocated. On-ground field photos confirm the delivered supplies and location. All milestone evidence requirements have been satisfied.`,
      needsHumanReview: false,
      provider: "mock",
      isDemoMode: true,
      rawModelOutput: JSON.stringify({ mockRule: "clean_approved", verifiedAmount: expectedBdt }),
    };
  }
}
